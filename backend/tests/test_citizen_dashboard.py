import io
import json
import pytest
from conftest import login


@pytest.fixture()
def citizen(client):
    return login(client, "citizen1", "citizen123")


@pytest.fixture()
def driver(client):
    return login(client, "driver1", "driver123")


def test_citizen_report_submission_without_video(client, citizen, admin):
    # Citizen submits report without video
    resp = client.post(
        "/api/citizen/report",
        headers=citizen,
        data={
            "lat": "13.0850",
            "lng": "80.2600",
            "location_name": "Anna Salai Junction, Chennai",
            "accident_type": "Two-wheeler accident",
            "vehicles_involved": "2",
            "injured_count": "1",
            "citizen_relationship": "I am reporting as a witness",
            "reporter_phone": "+91-98401-23456",
            "description": "Motorcycle collided with auto rickshaw near intersection.",
            "priority": "high"
        }
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    iid = data["id"]
    assert data["location_name"] == "Anna Salai Junction, Chennai"
    assert data["status"] == "suspected"
    assert data["source"] in ["citizen", "citizen_report"]
    assert data["accident_type"] == "Two-wheeler accident"
    assert data["vehicles_involved"] == 2
    assert data["injured_count"] == 1
    assert data["reporter_name"] == "Citizen Responder Priya Raman"
    assert data["reporter_phone"] == "+91-98401-23456"

    # Verify AI analysis payload is serialized
    ai = data.get("ai_analysis")
    if isinstance(ai, str):
        ai = json.loads(ai)
    assert ai is not None
    assert "Inconclusive" in ai.get("category", "") or "manual_report" in ai.get("status", "")

    # Dispatcher inspects incident
    inc_resp = client.get(f"/api/incidents/{iid}", headers=admin)
    assert inc_resp.status_code == 200
    inc_data = inc_resp.json()
    assert inc_data["reporter_phone"] == "+91-98401-23456"

    # Dispatcher confirms and dispatches nearest ambulance
    ver_resp = client.post(
        f"/api/incidents/{iid}/verify",
        headers=admin,
        json={"action": "confirm"}
    )
    assert ver_resp.status_code == 200
    assert ver_resp.json()["status"] in ["dispatching", "en_route", "confirmed"]


def test_citizen_report_submission_with_video(client, citizen):
    # Simulated MP4 video bytes
    dummy_video = b"\x00\x00\x00\x1cftypisom\x00\x00\x02\x00isomiso2mp41" + b"\x00" * 2000

    resp = client.post(
        "/api/citizen/report",
        headers=citizen,
        data={
            "lat": "13.0900",
            "lng": "80.2800",
            "location_name": "Poonamallee High Road",
            "accident_type": "Car accident",
            "vehicles_involved": "2",
            "injured_count": "2",
            "citizen_relationship": "I am involved",
            "reporter_phone": "+91-98401-99887",
            "description": "Frontal impact collision between two cars.",
            "priority": "critical"
        },
        files={
            "video": ("accident_dashcam.mp4", io.BytesIO(dummy_video), "video/mp4")
        }
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["video_url"] is not None
    assert data["video_url"].endswith(".mp4")

    # Verify AI analysis
    ai = data.get("ai_analysis")
    if isinstance(ai, str):
        ai = json.loads(ai)
    assert ai is not None
    assert "category" in ai


def test_citizen_my_reports_isolation(client, citizen, driver):
    # Submit report by citizen
    r1 = client.post(
        "/api/citizen/report",
        headers=citizen,
        data={
            "lat": "13.0700",
            "lng": "80.2500",
            "location_name": "Egmore Bridge",
            "accident_type": "Pedestrian accident",
            "vehicles_involved": "1",
            "injured_count": "1",
            "citizen_relationship": "witness",
            "reporter_phone": "+91-98401-11223"
        }
    )
    assert r1.status_code == 200

    # Citizen retrieves their reports
    my_reps = client.get("/api/citizen/my-reports", headers=citizen)
    assert my_reps.status_code == 200
    rep_list = my_reps.json()
    assert len(rep_list) >= 1
    assert any(x["location_name"] == "Egmore Bridge" for x in rep_list)

    # Driver retrieves my-reports (should be empty for driver since driver did not submit it)
    d_reps = client.get("/api/citizen/my-reports", headers=driver)
    assert d_reps.status_code == 200
    assert len(d_reps.json()) == 0


def test_emergency_contacts_crud(client, citizen):
    # 1. List contacts (initially empty or default)
    r = client.get("/api/citizen/contacts", headers=citizen)
    assert r.status_code == 200
    initial_count = len(r.json())

    # 2. Add Contact 1 (Primary)
    c1_resp = client.post(
        "/api/citizen/contacts",
        headers=citizen,
        json={
            "name": "Kavitha Raman",
            "phone": "+91-98401-44556",
            "relationship_type": "Mother",
            "is_primary": True
        }
    )
    assert c1_resp.status_code == 200, c1_resp.text
    c1 = c1_resp.json()
    assert c1["name"] == "Kavitha Raman"
    assert c1["is_primary"] is True
    c1_id = c1["id"]

    # 3. Add Contact 2 (Make new one primary, should demote Contact 1)
    c2_resp = client.post(
        "/api/citizen/contacts",
        headers=citizen,
        json={
            "name": "Rajesh Raman",
            "phone": "+91-98401-77889",
            "relationship_type": "Brother",
            "is_primary": True
        }
    )
    assert c2_resp.status_code == 200
    c2 = c2_resp.json()
    assert c2["is_primary"] is True
    c2_id = c2["id"]

    # Verify Contact 1 was demoted from primary
    contacts_list = client.get("/api/citizen/contacts", headers=citizen).json()
    c1_check = next(c for c in contacts_list if c["id"] == c1_id)
    c2_check = next(c for c in contacts_list if c["id"] == c2_id)
    assert c1_check["is_primary"] is False
    assert c2_check["is_primary"] is True

    # 4. Update Contact 1
    up_resp = client.patch(
        f"/api/citizen/contacts/{c1_id}",
        headers=citizen,
        json={
            "name": "Kavitha Raman (Updated)",
            "phone": "+91-98401-44550",
            "relationship_type": "Mother",
            "is_primary": False
        }
    )
    assert up_resp.status_code == 200
    assert up_resp.json()["name"] == "Kavitha Raman (Updated)"

    # 5. Delete Contact 2
    del_resp = client.delete(f"/api/citizen/contacts/{c2_id}", headers=citizen)
    assert del_resp.status_code == 200
    assert del_resp.json()["ok"] is True

    # Verify final count
    final_contacts = client.get("/api/citizen/contacts", headers=citizen).json()
    assert not any(c["id"] == c2_id for c in final_contacts)
