import sys
import os

# Set environment flag for models to skip unique constraints on MySQL
os.environ["IS_MIGRATION_TO_MYSQL"] = "true"

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Ensure server dir is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import settings
from db import Base
from db.models import Employee, Floor, ParkingSlot, Reservation, ManagerRelease, OTPVerification, PasswordReset

# Define connections
POSTGRES_URL = settings.DATABASE_URL
MYSQL_URL = "mysql+pymysql://root@localhost:3306/parking_db"

print(f"Connecting to Postgres (Supabase): {POSTGRES_URL.split('@')[-1]}")
print(f"Connecting to MySQL: {MYSQL_URL}")

pg_engine = create_engine(POSTGRES_URL)
mysql_engine = create_engine(MYSQL_URL)

PgSession = sessionmaker(bind=pg_engine)
MysqlSession = sessionmaker(bind=mysql_engine)

def migrate():
    # 1. Create all schemas on MySQL
    print("Dropping existing tables in MySQL for a clean rebuild...")
    Base.metadata.drop_all(bind=mysql_engine)
    print("Creating table structures in MySQL...")
    Base.metadata.create_all(bind=mysql_engine)
    print("MySQL tables created successfully.")

    pg_db = PgSession()
    mysql_db = MysqlSession()

    try:
        # Disable foreign key checks for bulk migration
        print("Disabling MySQL foreign key checks for bulk copy...")
        mysql_db.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
        mysql_db.commit()

        # Clear existing tables in MySQL to prevent duplicate keys
        tables = [PasswordReset, OTPVerification, ManagerRelease, Reservation, ParkingSlot, Floor, Employee]
        for table in tables:
            print(f"Clearing existing data in MySQL {table.__tablename__} table...")
            mysql_db.query(table).delete()
        mysql_db.commit()

        # Define tables to migrate in order
        migration_order = [
            (Employee, "employees"),
            (Floor, "floors"),
            (ParkingSlot, "parking_slots"),
            (Reservation, "reservations"),
            (ManagerRelease, "manager_releases"),
            (OTPVerification, "otp_verifications"),
            (PasswordReset, "password_resets"),
        ]

        for model, name in migration_order:
            print(f"Migrating {name}...")
            # Query from Postgres
            pg_rows = pg_db.query(model).all()
            print(f"  Found {len(pg_rows)} rows in Postgres.")
            
            if pg_rows:
                # We need to copy attributes to new MySQL-bound objects
                mysql_rows = []
                for row in pg_rows:
                    # Get all mapped attributes
                    attrs = {c.name: getattr(row, c.name) for c in model.__table__.columns}
                    # Construct a new instance for MySQL session
                    mysql_rows.append(model(**attrs))
                
                # Bulk save
                mysql_db.add_all(mysql_rows)
                mysql_db.commit()
                print(f"  Successfully copied {len(mysql_rows)} rows to MySQL.")
            else:
                print("  No rows to copy.")

    except Exception as e:
        print(f"Error during migration: {e}")
        mysql_db.rollback()
        raise e
    finally:
        # Re-enable foreign key checks
        print("Re-enabling MySQL foreign key checks...")
        mysql_db.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
        mysql_db.commit()
        pg_db.close()
        mysql_db.close()

if __name__ == "__main__":
    migrate()
    print("Migration finished successfully!")
