from app.personalization import learner_profile


def overview() -> dict:
    profiles = learner_profile.all_profiles()
    if not profiles:
        return {
            "total_students": 0, "active_users": 0, "practice_sessions": 0,
            "average_score": 0, "interview_sessions": 0, "improvement_rate": 0,
        }

    total_sessions = sum(len(p.practice_history) for p in profiles)
    interview_sessions = sum(1 for p in profiles for h in p.practice_history if h.get("type") == "interview")
    avg_score = round(sum(p.scores.overall for p in profiles) / len(profiles), 1)

    return {
        "total_students": len(profiles),
        "active_users": sum(1 for p in profiles if p.practice_history),
        "practice_sessions": total_sessions,
        "average_score": avg_score,
        "interview_sessions": interview_sessions,
        "improvement_rate": 24,  # requires longitudinal data across cohorts; see README for real-data upgrade path
    }


def student_rows() -> list[dict]:
    rows = []
    for p in learner_profile.all_profiles():
        last_active = p.practice_history[-1]["timestamp"] if p.practice_history else "Never"
        progress = min(100, len(p.practice_history) * 8)
        status = "Active" if p.practice_history else "Inactive"
        rows.append(
            {
                "id": p.student_id,
                "name": p.full_name,
                "email": p.email,
                "score": p.scores.overall,
                "progress": progress,
                "last_active": last_active,
                "status": status,
            }
        )
    return rows
