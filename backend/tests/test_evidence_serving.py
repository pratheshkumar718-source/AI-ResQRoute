def test_evidence_endpoints_and_fallback(client, admin):
    # 1. Test simulate incident generates 6 burst evidence frames
    resp = client.post("/api/detection/simulate", json={
        "camera_id": 1,
        "confidence": 0.95,
        "threshold": 0.90,
        "with_synthetic_frames": True
    }, headers=admin)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert len(data["evidence"]) == 6, f"Expected 6 evidence frames, got {len(data['evidence'])}"
    
    first_ev = data["evidence"][0]
    assert "url" in first_ev
    assert "filename" in first_ev
    assert first_ev["filename"]

    # 2. Test accessing via /evidence/{filename}
    img_resp1 = client.get(f"/evidence/{first_ev['filename']}")
    assert img_resp1.status_code == 200
    assert img_resp1.headers.get("content-type") == "image/jpeg"
    assert len(img_resp1.content) > 1000

    # 3. Test accessing via /api/evidence/{filename}
    img_resp2 = client.get(f"/api/evidence/{first_ev['filename']}")
    assert img_resp2.status_code == 200
    assert img_resp2.headers.get("content-type") == "image/jpeg"
    assert len(img_resp2.content) > 1000

    # 4. Test missing file auto-healing fallback
    fallback_resp = client.get("/api/evidence/non_existent_emergency_frame.jpg")
    assert fallback_resp.status_code == 200
    assert fallback_resp.headers.get("content-type") == "image/jpeg"
    assert len(fallback_resp.content) > 1000
