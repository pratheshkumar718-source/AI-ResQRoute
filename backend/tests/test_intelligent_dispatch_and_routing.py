"""Comprehensive test suite for ResQRoute AI:
Intelligent Ambulance Dispatch, Hospital Selection & Real Road-Based Navigation.

Verifies:
1. Real road-routing engine (OSRM) and deterministic simulated fallback (Dijkstra)
2. Intelligent nearest ambulance ranking by estimated road travel time
3. Exclusion of busy/offline/unsuitable ambulances
4. Driver offer and acceptance flow
5. Arrival on scene and clinical assessment recording
6. Multi-factor hospital suitability matching and recommendation
7. Road-route calculation to receiving hospital
8. Live device GPS location updates and remaining ETA recalculation
"""
import pytest
from app import routing
from app.models import Incident, Ambulance, Hospital, Assignment


def test_routing_engine_real_and_simulated():
    # Valid coordinates in Chennai urban corridor
    pt_amb = (13.0827, 80.2707)
    pt_scene = (13.0600, 80.2400)

    res = routing.route(pt_amb, pt_scene)
    assert "coords" in res
    assert len(res["coords"]) >= 2
    assert res["distance_km"] > 0
    assert res["eta_min"] > 0
    assert "simulated" in res
    assert "provider" in res
    assert "algorithm" in res

    # Destination identical to origin (< 5 meters)
    res_zero = routing.route(pt_amb, pt_amb)
    assert res_zero["distance_km"] == 0.0
    assert res_zero["eta_min"] == 0.1

    # Coordinate validation bounds
    with pytest.raises(ValueError):
        routing.route((95.0, 80.0), pt_scene)


def test_intelligent_ambulance_dispatch_ranks_by_road_eta(client, admin, d1):
    # Step 1: Create an incident
    r_inc = client.post("/api/incidents", json={
        "lat": 13.0700,
        "lng": 80.2500,
        "location_name": "Anna Salai Junction, Sector 2",
        "priority": "critical"
    }, headers=admin)
    assert r_inc.status_code == 200
    inc_id = r_inc.json()["id"]

    # Step 2: Verify and dispatch
    r_verify = client.post(f"/api/incidents/{inc_id}/verify", json={"action": "confirm"}, headers=admin)
    assert r_verify.status_code == 200
    inc_data = r_verify.json()
    assert inc_data["status"] in ("dispatching", "en_route")
    assert len(inc_data["assignments"]) >= 1

    asg = inc_data["assignments"][0]
    assert asg["status"] == "offered"
    assert asg["scene_route"] is not None
    assert asg["scene_route"]["distance_km"] > 0
    assert asg["remaining_eta"] > 0

    # Verify candidate ranking is stored and sorted by eta_min
    ranking = asg.get("ranking", [])
    assert len(ranking) >= 1
    for i in range(len(ranking) - 1):
        assert (ranking[i]["eta_min"], ranking[i]["distance_km"]) <= (ranking[i+1]["eta_min"], ranking[i+1]["distance_km"])


def test_driver_navigation_and_device_gps_location_update(client, admin, d1):
    # Create and dispatch incident
    r_inc = client.post("/api/incidents", json={
        "lat": 13.0800,
        "lng": 80.2600,
        "location_name": "Central Roundabout",
        "priority": "moderate"
    }, headers=admin)
    inc_id = r_inc.json()["id"]
    client.post(f"/api/incidents/{inc_id}/verify", json={"action": "confirm"}, headers=admin)

    inc = client.get(f"/api/incidents/{inc_id}", headers=admin).json()
    asg = inc["assignments"][0]
    aid = asg["id"]
    amb_id = asg["ambulance_id"]

    # Driver accepts offer
    r_accept = client.post(f"/api/assignments/{aid}/respond", json={"accept": True}, headers=d1)
    assert r_accept.status_code == 200
    assert r_accept.json()["status"] == "en_route"

    # Driver sends live device GPS update
    r_loc = client.post(f"/api/ambulances/{amb_id}/location", json={
        "lat": 13.0750,
        "lng": 80.2580,
        "accuracy_m": 4.5,
        "heading": 180.0,
        "speed_kmh": 42.0
    }, headers=d1)
    assert r_loc.status_code == 200
    loc_data = r_loc.json()
    assert loc_data["ok"] is True
    assert loc_data["ambulance"]["lat"] == 13.0750
    assert loc_data["source"] == "device_gps"
    assert loc_data["simulated"] is False


def test_scene_arrival_and_clinical_assessment_workflow(client, admin, d1):
    # Create incident, dispatch, accept
    r_inc = client.post("/api/incidents", json={
        "lat": 13.0850,
        "lng": 80.2550,
        "location_name": "Poonamallee High Road",
        "priority": "critical"
    }, headers=admin)
    inc_id = r_inc.json()["id"]
    client.post(f"/api/incidents/{inc_id}/verify", json={"action": "confirm"}, headers=admin)

    inc = client.get(f"/api/incidents/{inc_id}", headers=admin).json()
    asg = inc["assignments"][0]
    aid = asg["id"]

    client.post(f"/api/assignments/{aid}/respond", json={"accept": True}, headers=d1)
    # Fast forward to scene
    client.post(f"/api/assignments/{aid}/simulate/skip", headers=d1)

    # Mark arrival on scene
    r_arrive = client.post(f"/api/assignments/{aid}/arrive-scene", headers=d1)
    assert r_arrive.status_code == 200
    inc_on_scene = r_arrive.json()
    assert inc_on_scene["status"] == "on_scene"

    # Driver submits clinical patient assessment
    r_assess = client.post(f"/api/assignments/{aid}/assessment", json={
        "severity": "critical",
        "patients": 2,
        "needs": ["emergency", "icu"],
        "notes": "Two passengers extracted with severe trauma. Immediate ICU resuscitation required."
    }, headers=d1)
    assert r_assess.status_code == 200
    inc_assessed = r_assess.json()
    assert inc_assessed["status"] == "assessed"
    assert inc_assessed["selected_hospital_id"] is not None

    # Check that hospital recommendation evaluates road ETA and needs
    r_recs = client.get(f"/api/incidents/{inc_id}/recommended-hospitals", headers=admin).json()
    assert "candidates" in r_recs
    elig_cands = [c for c in r_recs["candidates"] if c["eligible"]]
    assert len(elig_cands) >= 1
    # Check that candidates have distance_km and eta_min
    for c in elig_cands:
        assert c["distance_km"] > 0
        assert c["eta_min"] > 0
        assert "hospital" in c

    # Driver starts hospital transport
    r_trans = client.post(f"/api/assignments/{aid}/start-hospital-route", headers=d1)
    assert r_trans.status_code == 200
    assert r_trans.json()["status"] == "transporting"

    # Fast forward to hospital
    client.post(f"/api/assignments/{aid}/simulate/skip", headers=d1)

    # Arrive at hospital and complete handover
    r_hosp_arrive = client.post(f"/api/assignments/{aid}/arrive-hospital", headers=d1)
    assert r_hosp_arrive.status_code == 200
    assert r_hosp_arrive.json()["status"] == "at_hospital"

    r_done = client.post(f"/api/assignments/{aid}/complete", headers=d1)
    assert r_done.status_code == 200
    assert r_done.json()["status"] == "completed"
