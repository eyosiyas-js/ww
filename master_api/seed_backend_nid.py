import sys
from sqlalchemy import create_engine, text
from datetime import date

# USE THE CORRECT DATABASE URI
uri = "postgresql://postgres:postgres@localhost:5432/backend"
engine = create_engine(uri)

profiles = [
    {
        "id": "p-883920",
        "national_id_number": "883920",
        "full_name": "Abebe Bikila",
        "first_name": "Abebe",
        "last_name": "Bikila",
        "gender": "Male",
        "date_of_birth": "1932-08-07",
        "nationality": "Ethiopian",
        "address": "Addis Ababa, Ethiopia",
        "region": "Addis Ababa",
        "occupation": "Athlete / Officer",
        "phone_number": "+251 911 223344"
    },
    {
        "id": "p-99283746",
        "national_id_number": "NID-99283746",
        "full_name": "Mamo Wolde",
        "first_name": "Mamo",
        "last_name": "Wolde",
        "gender": "Male",
        "date_of_birth": "1932-06-12",
        "nationality": "Ethiopian",
        "address": "Addis Ababa",
        "region": "Addis Ababa"
    },
    {
        "id": "p-11223344",
        "national_id_number": "NID-11223344",
        "full_name": "Haile Gebrselassie",
        "first_name": "Haile",
        "last_name": "Gebrselassie",
        "gender": "Male",
        "date_of_birth": "1973-04-18",
        "nationality": "Ethiopian",
        "address": "Addis Ababa",
        "region": "Addis Ababa",
        "occupation": "Businessman / Athlete",
        "phone_number": "+251 911 556677"
    }
]

with engine.connect() as conn:
    for p in profiles:
        try:
            sql = text("""
                INSERT INTO national_id_profile 
                (id, national_id_number, full_name, first_name, last_name, gender, date_of_birth, nationality, address, region, occupation, phone_number, status) 
                VALUES 
                (:id, :national_id_number, :full_name, :first_name, :last_name, :gender, :date_of_birth, :nationality, :address, :region, :occupation, :phone_number, 'active')
                ON CONFLICT (national_id_number) DO UPDATE SET 
                full_name = EXCLUDED.full_name,
                occupation = EXCLUDED.occupation,
                phone_number = EXCLUDED.phone_number
            """)
            conn.execute(sql, p)
            conn.commit()
            print(f"SUCCESS: Seeded {p['full_name']}")
        except Exception as e:
            conn.rollback()
            print(f"ERROR: {str(e)}")

print("\nSeeding complete on 'backend' database!")
