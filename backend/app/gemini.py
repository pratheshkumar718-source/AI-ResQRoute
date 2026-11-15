"""Google Gemini API Integration for ResQRoute AI Incident Evidence Analysis.

Provides optional secondary incident summarization and evidence observation assistance.
Constraints:
- Must NOT independently confirm or reject an accident.
- Must NOT diagnose injuries or determine clinical severity.
- Must NOT select or dispatch ambulances.
- All outputs are explicitly marked AI-generated and require human dispatcher review.
- Operates strictly in the backend; GEMINI_API_KEY is never exposed to the frontend.
- Works 100% gracefully offline or when GEMINI_API_KEY is unset.
"""
import base64
import json
import logging
import os
from pathlib import Path
from typing import List, Optional, Dict, Any
import httpx

logger = logging.getLogger("resqroute.gemini")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()
GEMINI_ENDPOINT = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"


def is_gemini_available() -> bool:
    """Returns True if GEMINI_API_KEY is configured in backend environment."""
    return bool(os.getenv("GEMINI_API_KEY", "").strip())


def analyze_incident_evidence(
    image_paths: List[Path],
    metadata: Dict[str, Any]
) -> Dict[str, Any]:
    """Sends evidence frames and incident metadata to Gemini for structured visual observation.
    
    Returns structured JSON with incident_summary, visible_vehicle_count, visible_hazards,
    observed_collision_indicators, evidence_observations, and analysis_limitations.
    """
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return {
            "status": "unavailable",
            "ai_generated": True,
            "requires_human_review": True,
            "incident_summary": (
                f"Incident reported at {metadata.get('location_name', 'Scene')}. "
                "Gemini AI assistant is offline/unconfigured. Dispatcher visual verification required."
            ),
            "visible_vehicle_count": metadata.get("vehicles_involved", "Pending review"),
            "visible_hazards": ["Scene hazard assessment pending visual inspection"],
            "observed_collision_indicators": [f"Reported type: {metadata.get('accident_type', 'Collision')}"],
            "evidence_observations": [
                f"{len(image_paths)} visual frame(s) saved for dispatcher review."
            ],
            "analysis_limitations": "GEMINI_API_KEY not configured in backend environment variables."
        }

    # Prepare image parts (up to 3 frames to remain responsive and avoid large payloads)
    parts: List[Dict[str, Any]] = []

    prompt = (
        "You are an AI emergency incident analysis assistant for ResQRoute AI.\n"
        "Analyze the attached traffic evidence frame(s) along with the following incident report:\n"
        f"- Location: {metadata.get('location_name', 'Unknown')}\n"
        f"- Reported Accident Type: {metadata.get('accident_type', 'Unknown')}\n"
        f"- Reporter Relationship: {metadata.get('citizen_relationship', 'Witness')}\n"
        f"- Reporter Description: {metadata.get('description', 'None provided')}\n"
        f"- Reported Vehicles: {metadata.get('vehicles_involved', 'Unknown')}\n"
        f"- Reported Injured: {metadata.get('injured_count', 'Unknown')}\n\n"
        "STRICT SAFETY CONSTRAINTS:\n"
        "1. Do NOT independently confirm or reject an accident.\n"
        "2. Do NOT diagnose injuries or determine medical severity.\n"
        "3. Do NOT select or dispatch emergency vehicles.\n"
        "4. Only describe what is visibly observable. Do not fabricate vehicles or details.\n\n"
        "Respond ONLY with a valid JSON object matching this exact schema:\n"
        "{\n"
        '  "incident_summary": "Concise 1-2 sentence visual summary of what is visible in the frame(s)",\n'
        '  "visible_vehicle_count": "Number of vehicles visible or \'Not clearly identifiable\'",\n'
        '  "visible_hazards": ["List of visible roadway hazards such as fuel sheen, debris, lane blockage, smoke, etc."],\n'
        '  "observed_collision_indicators": ["List of physical collision indicators such as panel deformation, shattered glass, skid marks, tilted chassis, or \'None definitively visible\'"],\n'
        '  "evidence_observations": ["2-3 bullet observations regarding lighting, road conditions, and orientation"],\n'
        '  "analysis_limitations": "Explicit note on image resolution, camera angle, and occlusion limits"\n'
        "}"
    )

    parts.append({"text": prompt})

    valid_images = 0
    for p in image_paths[:3]:
        if p.is_file():
            try:
                b64_data = base64.b64encode(p.read_bytes()).decode("utf-8")
                parts.append({
                    "inline_data": {
                        "mime_type": "image/jpeg",
                        "data": b64_data
                    }
                })
                valid_images += 1
            except Exception as e:
                logger.warning(f"Could not encode evidence frame {p}: {e}")

    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json"
        }
    }

    try:
        url = f"{GEMINI_ENDPOINT}?key={api_key}"
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(url, json=payload)
            if resp.status_code != 200:
                logger.warning(f"Gemini API returned status {resp.status_code}: {resp.text}")
                return {
                    "status": "error",
                    "ai_generated": True,
                    "requires_human_review": True,
                    "incident_summary": f"Gemini API error (HTTP {resp.status_code}). Human dispatcher review required.",
                    "visible_vehicle_count": metadata.get("vehicles_involved", "Pending review"),
                    "visible_hazards": ["Awaiting human verification"],
                    "observed_collision_indicators": ["Citizen report logged"],
                    "evidence_observations": [f"{valid_images} frame(s) recorded"],
                    "analysis_limitations": f"Gemini API returned HTTP {resp.status_code}."
                }

            result_json = resp.json()
            candidates = result_json.get("candidates", [])
            if candidates:
                content = candidates[0].get("content", {})
                parts = content.get("parts", [])
                if parts:
                    raw_text = parts[0].get("text", "").strip()
                    # Clean markdown code block if present
                    if raw_text.startswith("```json"):
                        raw_text = raw_text[7:]
                    if raw_text.startswith("```"):
                        raw_text = raw_text[3:]
                    if raw_text.endswith("```"):
                        raw_text = raw_text[:-3]
                    
                    parsed = json.loads(raw_text.strip())
                    parsed["status"] = "success"
                    parsed["ai_generated"] = True
                    parsed["requires_human_review"] = True
                    return parsed

    except Exception as ex:
        logger.warning(f"Failed to query Gemini API: {ex}")

    return {
        "status": "fallback",
        "ai_generated": True,
        "requires_human_review": True,
        "incident_summary": (
            f"Accident report at {metadata.get('location_name', 'Scene')}. "
            "Automated visual analysis unavailable. Dispatcher manual verification required."
        ),
        "visible_vehicle_count": metadata.get("vehicles_involved", "Unknown"),
        "visible_hazards": ["Awaiting dispatcher inspection"],
        "observed_collision_indicators": [f"Type: {metadata.get('accident_type', 'Vehicle incident')}"],
        "evidence_observations": [f"{valid_images} visual evidence frame(s) recorded."],
        "analysis_limitations": "Gemini connection timeout or parse exception."
    }
