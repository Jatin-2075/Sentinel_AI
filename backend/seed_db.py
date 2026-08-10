"""
Database Seeding Script for Sentinel
Generates fake data to populate the database for testing and development
"""

import sys
import os
from pathlib import Path

# Get the backend directory and add it to path
backend_dir = Path(__file__).parent
parent_dir = backend_dir.parent
sys.path.insert(0, str(parent_dir))

import uuid
import random
import secrets
from datetime import datetime, timedelta
from faker import Faker
import numpy as np
from sqlalchemy.orm import Session

# Import models and database (using absolute imports from package root)
from backend.Database.database import SessionLocal
from backend.Models.auth_model import Auth_User, Personal_Data
from backend.Models.project_model import Projects, Project_Events
from backend.Models.incidents_model import Incidents, Incidents_Resolved
from backend.Models.embedding_model import IncidentEmbeddings
from backend.Core.jwt import hash_password

fake = Faker()

# ==================== Constants ====================

SOURCES = ["frontend", "backend", "db"]
EVENT_TYPES = [
    "page_load",
    "api_call",
    "database_query",
    "error",
    "cache_miss",
    "timeout",
    "memory_spike",
    "cpu_spike",
    "network_latency",
    "authentication_failure",
]
STATUS_VALUES = ["success", "error", "warning", "timeout"]
SEVERITIES = ["low", "medium", "high", "critical"]
INCIDENT_STATUS = ["Open", "Investigating", "Resolved"]
OCCUPATIONS = [
    "Software Engineer",
    "DevOps Engineer",
    "Data Scientist",
    "Backend Developer",
    "Frontend Developer",
    "Full Stack Developer",
    "System Administrator",
    "Cloud Architect",
]

# ==================== Helper Functions ====================

def generate_api_key() -> str:
    """Generate a secure API key"""
    return f"sk_{secrets.token_hex(32)}"


def generate_embedding(dimension: int = 768) -> list:
    """Generate a random embedding vector"""
    return np.random.randn(dimension).tolist()


def get_random_datetime(days_back: int = 30) -> datetime:
    """Get a random datetime within the last N days"""
    now = datetime.utcnow()
    random_days = random.randint(0, days_back)
    random_hours = random.randint(0, 23)
    random_minutes = random.randint(0, 59)
    return now - timedelta(days=random_days, hours=random_hours, minutes=random_minutes)


# ==================== Seeding Functions ====================

def seed_users_and_profiles(db: Session, count: int = 3) -> list[uuid.UUID]:
    """Create test users and their personal data"""
    print(f"\n📝 Creating {count} test users...")
    user_ids = []

    for i in range(count):
        # Create user
        user = Auth_User(
            id=uuid.uuid4(),
            username=f"testuser{i+1}",
            password=hash_password("password123"),
            created_at=get_random_datetime(90),
        )
        db.add(user)
        db.flush()  # Get the ID before committing
        user_ids.append(user.id)

        # Create personal data
        profile = Personal_Data(
            id=uuid.uuid4(),
            auth_id=user.id,
            name=fake.name(),
            dob=fake.date_of_birth(minimum_age=22, maximum_age=65).isoformat(),
            phone=fake.phone_number(),
            email=fake.email(),
            occupation=random.choice(OCCUPATIONS),
            created_at=user.created_at,
        )
        db.add(profile)
        print(f"  ✓ Created user: {user.username} ({user.id})")

    db.commit()
    return user_ids


def seed_projects(db: Session, user_ids: list[uuid.UUID], projects_per_user: int = 2) -> dict:
    """Create projects for users"""
    print(f"\n🏗️  Creating {len(user_ids) * projects_per_user} projects...")
    projects_map = {}  # {user_id: [project_ids]}

    for user_id in user_ids:
        projects_map[user_id] = []

        for i in range(projects_per_user):
            project_name = f"{fake.word()}_service"
            project = Projects(
                id=uuid.uuid4(),
                auth_id=user_id,
                name=project_name,
                frontend_url=f"https://{project_name}.example.com",
                backend_url=f"https://api.{project_name}.example.com",
                database_type=random.choice(["PostgreSQL", "MongoDB", "MySQL"]),
                database_host=f"db-{project_name}.internal",
                database_port=random.choice([5432, 3306, 27017]),
                database_name=project_name,
                api_key=generate_api_key(),
                created_at=get_random_datetime(60),
            )
            db.add(project)
            db.flush()
            projects_map[user_id].append(project.id)
            print(f"  ✓ Created project: {project_name} for user {user_id}")

    db.commit()
    return projects_map


def seed_events(db: Session, projects_map: dict, events_per_project: int = 50) -> dict:
    """Create events for projects"""
    print(f"\n📊 Creating events...")
    events_map = {}  # {project_id: [event_ids]}

    total_events = sum(len(projects) * events_per_project for projects in projects_map.values())
    print(f"  Total events to create: {total_events}")

    for user_id, project_ids in projects_map.items():
        for project_id in project_ids:
            events_map[project_id] = []
            created_count = 0

            for _ in range(events_per_project):
                event = Project_Events(
                    id=uuid.uuid4(),
                    project_id=project_id,
                    source=random.choice(SOURCES),
                    event_type=random.choice(EVENT_TYPES),
                    endpoint=f"/{'/'.join([fake.word() for _ in range(random.randint(1, 3))])}",
                    duration_ms=random.randint(50, 5000),
                    status=random.choice(STATUS_VALUES),
                    http_status=random.choice([200, 201, 400, 401, 404, 500, 502, 503]),
                    payload={
                        "user_agent": fake.user_agent(),
                        "ip": fake.ipv4(),
                        "timestamp": datetime.utcnow().isoformat(),
                    },
                    created_at=get_random_datetime(30),
                )
                db.add(event)
                db.flush()
                events_map[project_id].append(event.id)
                created_count += 1

            db.commit()
            print(f"  ✓ Created {created_count} events for project {project_id}")

    return events_map


def seed_incidents(db: Session, events_map: dict, incident_ratio: float = 0.2) -> dict:
    """Create incidents from a subset of events"""
    print(f"\n🚨 Creating incidents...")
    incidents_map = {}  # {project_id: [incident_ids]}
    project_map_reverse = {}  # Get project_id from event_id

    # Build reverse mapping
    for project_id, event_ids in events_map.items():
        for event_id in event_ids:
            project_map_reverse[event_id] = project_id
        incidents_map[project_id] = []

    total_potential_incidents = sum(
        len(event_ids) for event_ids in events_map.values()
    )
    num_incidents = int(total_potential_incidents * incident_ratio)
    print(f"  Total potential incidents: {total_potential_incidents}")
    print(f"  Creating {num_incidents} incidents ({incident_ratio*100}% ratio)...")

    # Select random events to become incidents
    all_event_ids = [
        event_id
        for event_ids in events_map.values()
        for event_id in event_ids
    ]
    incident_event_ids = random.sample(all_event_ids, min(num_incidents, len(all_event_ids)))

    incident_count = 0
    for event_id in incident_event_ids:
        project_id = project_map_reverse[event_id]

        incident = Incidents(
            id=uuid.uuid4(),
            project_id=project_id,
            event_id=event_id,
            title=f"Incident: {fake.sentence(nb_words=3).rstrip('.')}",
            severity=random.choice(SEVERITIES),
            source_layer=random.choice(SOURCES),
            status=random.choice(INCIDENT_STATUS),
            root_cause=fake.sentence(nb_words=10) if random.random() > 0.3 else None,
            summary=fake.paragraph(nb_sentences=3) if random.random() > 0.4 else None,
            ai_suggestion=fake.paragraph(nb_sentences=2) if random.random() > 0.5 else None,
            resolved_at=get_random_datetime(30) if random.random() > 0.6 else None,
            created_at=get_random_datetime(30),
        )
        db.add(incident)
        db.flush()
        incidents_map[project_id].append(incident.id)
        incident_count += 1

    db.commit()
    print(f"  ✓ Created {incident_count} incidents")
    return incidents_map


def seed_resolved_incidents(db: Session, user_ids: list[uuid.UUID], incidents_map: dict):
    """Create resolved incident records"""
    print(f"\n✅ Creating resolved incident records...")
    resolved_count = 0

    for user_id, project_ids_in_user in [(uid, pid) for uid in user_ids for pid in []]:
        pass  # Placeholder for now

    # Get resolved incidents from all projects
    all_resolved = []
    for project_id, incident_ids in incidents_map.items():
        # Get incidents that are resolved
        incidents = db.query(Incidents).filter(
            Incidents.id.in_(incident_ids),
            Incidents.status == "Resolved"
        ).all()

        for incident in incidents:
            all_resolved.append((project_id, incident.id))

    # Create resolution records for resolved incidents
    for project_id, incident_id in all_resolved:
        resolved_incident = Incidents_Resolved(
            id=uuid.uuid4(),
            project_id=project_id,
            incident_id=incident_id,
            created_by=random.choice(user_ids) if random.random() > 0.5 else None,
            source=random.choice(["ai_edited", "manual"]),
            resolution_text=fake.paragraph(nb_sentences=4),
            created_at=get_random_datetime(30),
        )
        db.add(resolved_incident)
        resolved_count += 1

    db.commit()
    print(f"  ✓ Created {resolved_count} resolved incident records")


def seed_embeddings(db: Session, incidents_map: dict):
    """Create embeddings for incidents"""
    print(f"\n🧠 Creating incident embeddings...")
    embedding_count = 0

    for project_id, incident_ids in incidents_map.items():
        for incident_id in incident_ids:
            embedding = IncidentEmbeddings(
                id=uuid.uuid4(),
                project_id=project_id,
                incident_id=incident_id,
                embedding=generate_embedding(768),
            )
            db.add(embedding)
            embedding_count += 1

    db.commit()
    print(f"  ✓ Created {embedding_count} embeddings")


# ==================== Main Seeding Function ====================

def seed_database():
    """Execute all seeding operations"""
    print("\n" + "="*60)
    print("🌱 Sentinel Database Seeding Started")
    print("="*60)

    db = SessionLocal()

    try:
        # Seed data
        user_ids = seed_users_and_profiles(db, count=3)
        projects_map = seed_projects(db, user_ids, projects_per_user=2)
        events_map = seed_events(db, projects_map, events_per_project=50)
        incidents_map = seed_incidents(db, events_map, incident_ratio=0.2)
        seed_resolved_incidents(db, user_ids, incidents_map)
        seed_embeddings(db, incidents_map)

        # Summary
        print("\n" + "="*60)
        print("✨ Database Seeding Completed Successfully!")
        print("="*60)
        print(f"\n📊 Summary:")
        print(f"  • Users created: {len(user_ids)}")
        print(f"  • Projects created: {sum(len(p) for p in projects_map.values())}")
        print(f"  • Events created: {sum(len(e) for e in events_map.values())}")
        print(f"  • Incidents created: {sum(len(i) for i in incidents_map.values())}")
        print(f"  • Embeddings created: {sum(len(i) for i in incidents_map.values())}")
        print("\n🔐 Test Credentials:")
        for i in range(len(user_ids)):
            print(f"  • Username: testuser{i+1}")
            print(f"    Password: password123")
        print("\n" + "="*60 + "\n")

    except Exception as e:
        print(f"\n❌ Error during seeding: {str(e)}")
        print(f"   {type(e).__name__}")
        import traceback
        traceback.print_exc()
        db.rollback()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
