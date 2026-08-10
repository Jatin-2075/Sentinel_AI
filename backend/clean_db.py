"""
Database Cleanup Script
Safely removes all data from the database while preserving the schema
"""

import sys
import os
from pathlib import Path

# Get the backend directory and add it to path
backend_dir = Path(__file__).parent
parent_dir = backend_dir.parent
sys.path.insert(0, str(parent_dir))

from sqlalchemy import text
from backend.Database.database import SessionLocal

def clean_database():
    """Remove all data from database"""
    print("\n" + "="*60)
    print("🗑️  Database Cleanup Started")
    print("="*60)
    print("\n⚠️  WARNING: This will delete all data from the database!")
    response = input("Type 'yes' to confirm: ").strip().lower()
    
    if response != "yes":
        print("Cleanup cancelled.")
        return
    
    db = SessionLocal()
    try:
        print("\n🔄 Removing data from tables...")
        
        # Tables in order of foreign key dependencies (reverse order of creation)
        tables = [
            "Incident_Embeddings",
            "Incidents_Resolved",
            "Incidents",
            "Project_Events",
            "Projects",
            "Personal_Data",
            "Auth_User",
        ]
        
        for table in tables:
            try:
                db.execute(text(f"TRUNCATE TABLE \"{table}\" RESTART IDENTITY CASCADE;"))
                print(f"  ✓ Cleaned: {table}")
            except Exception as e:
                print(f"  ✗ Error cleaning {table}: {str(e)}")
        
        db.commit()
        
        print("\n" + "="*60)
        print("✨ Database cleanup completed!")
        print("="*60 + "\n")
        
    except Exception as e:
        print(f"\n❌ Error during cleanup: {str(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    clean_database()
