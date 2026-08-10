# Database Seeding Guide

This guide explains how to populate your Sentinel database with realistic fake data for testing and development.

## Prerequisites

1. **Database Running**: Ensure PostgreSQL is running and your `DATABASE_URL` is configured in `.env`
2. **Dependencies Installed**: Run `pip install -r requirements.txt`
   - This includes `faker` for generating fake data
   - And `numpy` for generating embedding vectors

## Quick Start

### Option 1: Seed with Default Data

```bash
cd backend
python seed_db.py
```

This creates:
- **3 test users** with personal profiles
- **2 projects per user** (6 total projects)
- **50 events per project** (300 total events)
- **~60 incidents** (20% of events become incidents)
- **Resolved incident records** with resolutions
- **Embeddings** for all incidents

### Option 2: Clean Database First, Then Seed

```bash
# Remove all existing data
python clean_db.py

# Seed fresh data
python seed_db.py
```

## Test Credentials

After seeding, use these credentials to log in:

```
Username: testuser1
Password: password123

Username: testuser2
Password: password123

Username: testuser3
Password: password123
```

## What Gets Created

### Users (3 total)
- Unique usernames: `testuser1`, `testuser2`, `testuser3`
- All with password: `password123`
- Each with a complete personal profile (name, DOB, phone, email, occupation)

### Projects (6 total: 2 per user)
- Realistic service names (e.g., `stellar_service`, `quantum_service`)
- Frontend & backend URLs
- Database configuration (PostgreSQL/MongoDB/MySQL)
- Unique API keys for event ingestion

### Events (300 total: 50 per project)
- Random event types: page_load, api_call, database_query, error, timeout, etc.
- Sources: frontend, backend, database
- Realistic HTTP status codes (200, 201, 400, 500, 503, etc.)
- Duration metrics (50-5000ms)
- Random payloads with user agent, IP, timestamp

### Incidents (~60 total)
- Created from random events (~20% ratio)
- Severity levels: low, medium, high, critical
- Status: Open, Investigating, Resolved
- AI suggestions and root causes (for some)
- Resolved timestamps (for ~40% of incidents)

### Resolved Incidents
- Only created for incidents marked as "Resolved"
- Includes resolution text and source (AI-edited or manual)
- Tracks who resolved the incident (if applicable)

### Embeddings (One per incident)
- 768-dimensional vectors (pgvector format)
- Used for similarity search and AI analysis

## Customization

### Modify Seeding Parameters

Edit `seed_db.py` and change:

```python
# Number of test users
seed_users_and_profiles(db, count=5)  # Default: 3

# Projects per user
seed_projects(db, user_ids, projects_per_user=3)  # Default: 2

# Events per project
seed_events(db, projects_map, events_per_project=100)  # Default: 50

# Incident ratio (% of events that become incidents)
seed_incidents(db, events_map, incident_ratio=0.3)  # Default: 0.2
```

### Add More Diversity

The script uses `faker` library which generates:
- Random but realistic names, emails, phone numbers
- Random job titles and descriptions
- Random sentences and paragraphs

To add more variety, increase the user/project/event counts.

## Database Structure

The seeding script respects all database relationships:
- ✅ Users → Personal Data (1:1)
- ✅ Users → Projects (1:N)
- ✅ Projects → Events (1:N)
- ✅ Events → Incidents (1:1 for incident events)
- ✅ Projects → Incidents (1:N)
- ✅ Incidents → Embeddings (1:1)
- ✅ Incidents → Resolved Records (1:N)

## Timing

- **Seed with defaults**: ~10-15 seconds
- **Includes random timestamps**: Events dated within last 30 days
- **Resolved incidents**: Created in order they were marked resolved

## Troubleshooting

### "ImportError: No module named 'faker'"
```bash
pip install faker numpy
```

### "UNIQUE constraint failed"
- Run `clean_db.py` first to clear existing data
- This usually means the database already has data with conflicting values

### "Connection refused" error
- Verify PostgreSQL is running
- Check `DATABASE_URL` in `.env` is correct
- Test connection: `psql -c "SELECT 1"`

### "pgvector extension not found"
- Connect to your database and run:
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ```

## After Seeding

1. **Test Frontend Login**: Use testuser1/password123 at http://localhost:5173
2. **View Projects**: Dashboard shows all created projects
3. **Check Events**: Click into a project to see events and incidents
4. **Test API**: Use the API keys from project settings for event ingestion

## Re-seed Different Data

```bash
# Clean old data
python clean_db.py

# Edit seed_db.py to change parameters (users, projects, events, etc.)

# Seed with new parameters
python seed_db.py
```

## Production Notes

⚠️ **Do NOT run seed scripts in production!**

These are development utilities. For production:
- Remove these scripts from deployment
- Use proper database migrations (alembic)
- Avoid fake data in production databases
- Implement proper backup/restore procedures

## File Reference

| File | Purpose |
|------|---------|
| `seed_db.py` | Main seeding script - generates fake data |
| `clean_db.py` | Database cleanup - removes all data |
| `requirements.txt` | Updated to include faker and numpy |

## Questions?

Refer to the script comments for detailed implementation of each seeding function.
