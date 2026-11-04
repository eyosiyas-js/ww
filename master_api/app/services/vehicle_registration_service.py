import random
import uuid
from datetime import date, timedelta
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from app.schemas.vehicle_registration import (
    VehicleSearchRequest,
    VehicleSearchResponse,
    VehicleRegistrationCreate
)
from app.crud.crud_vehicle_registration import vehicle_registration


class VehicleRegistrationService:
    def __init__(self):
        self.use_mock = True
        self.api_url = None
        self.api_key = None
        self._mock_data = self._generate_mock_data()

    def _generate_mock_data(self) -> List[Dict[str, Any]]:
        """Generate mock vehicle registration data"""
        
        ethiopian_names = [
            "Abebe Bikila", "Haile Gebrselassie", "Derartu Tulu", "Tirunesh Dibaba",
            "Kenenisa Bekele", "Meseret Defar", "Almaz Ayana", "Lelisa Desisa",
            "Feyisa Lilesa", "Tiki Gelana", "Gelete Burka", "Yemane Tsegay",
            "Tariku Bekele", "Sileshi Sihine", "Werknesh Kidane", "Ejegayehu Dibaba"
        ]
        
        vehicle_makes = [
            ("Toyota", ["Land Cruiser", "Corolla", "Camry", "Hilux", "RAV4"]),
            ("Nissan", ["Patrol", "X-Trail", "Qashqai", "Navara", "Altima"]),
            ("Honda", ["Accord", "Civic", "CR-V", "Pilot", "Fit"]),
            ("Hyundai", ["Tucson", "Santa Fe", "Elantra", "Accent", "Creta"]),
            ("Suzuki", ["Vitara", "Swift", "Jimny", "Ertiga", "Baleno"]),
            ("Isuzu", ["D-Max", "MU-X", "Trooper", "NPR", "FRR"]),
            ("Mitsubishi", ["Pajero", "L200", "Outlander", "ASX", "Lancer"]),
            ("Mercedes-Benz", ["C-Class", "E-Class", "GLE", "GLC", "S-Class"]),
            ("BMW", ["X5", "3 Series", "5 Series", "X3", "7 Series"]),
            ("Land Rover", ["Discovery", "Range Rover", "Defender", "Evoque", "Sport"])
        ]
        
        colors = ["White", "Black", "Silver", "Blue", "Red", "Gray", "Green", "Brown", "Gold", "Beige"]
        vehicle_types = ["Sedan", "SUV", "Pickup Truck", "Hatchback", "Van", "Minibus", "Truck"]
        fuel_types = ["Petrol", "Diesel", "Hybrid", "Electric"]
        transmission_types = ["Manual", "Automatic"]
        regions = ["AA", "OR", "AM", "TG", "SM", "AF", "BG", "DD", "GM", "HR", "SN"]
        
        mock_vehicles = []
        
        for i in range(50):
            make, models = random.choice(vehicle_makes)
            model = random.choice(models)
            year = random.randint(2010, 2024)
            color = random.choice(colors)
            vehicle_type = random.choice(vehicle_types)
            region = random.choice(regions)
            
            # Generate plate number (Ethiopian format: 3-REGION-12345)
            plate_number = f"{random.randint(1, 5)}-{region}-{random.randint(10000, 99999)}"
            
            # Registration dates
            reg_date = date.today() - timedelta(days=random.randint(30, 1825))
            exp_date = reg_date + timedelta(days=365 * random.randint(1, 3))
            
            # Insurance dates
            ins_exp_date = date.today() + timedelta(days=random.randint(-30, 365))
            ins_status = "active" if ins_exp_date > date.today() else "expired"
            
            # Random flags
            has_violations = random.random() < 0.2  # 20% have violations
            is_stolen = random.random() < 0.02  # 2% stolen
            is_wanted = random.random() < 0.03  # 3% wanted
            
            vehicle = {
                "plate_number": plate_number,
                "vehicle_make": make,
                "vehicle_model": model,
                "vehicle_year": year,
                "vehicle_color": color,
                "vehicle_type": vehicle_type,
                "vin_number": f"VIN{uuid.uuid4().hex[:17].upper()}",
                "engine_number": f"ENG{random.randint(100000, 999999)}",
                "chassis_number": f"CHS{random.randint(100000, 999999)}",
                "registration_date": reg_date.isoformat(),
                "expiry_date": exp_date.isoformat(),
                "registration_status": "active" if exp_date > date.today() else "expired",
                "region_code": region,
                "issuing_authority": f"{region} Transport Bureau",
                "owner_name": random.choice(ethiopian_names),
                "owner_national_id": f"ET{random.randint(1000000000, 9999999999)}",
                "owner_address": f"{random.randint(1, 999)} {random.choice(['Bole', 'Piassa', 'Merkato', 'Kazanchis', 'Megenagna'])} Street, Addis Ababa",
                "owner_phone": f"+251{random.randint(900000000, 999999999)}",
                "owner_email": f"{random.choice(ethiopian_names).lower().replace(' ', '.')}@email.com",
                "insurance_company": random.choice(["Awash Insurance", "Ethiopian Insurance", "Nile Insurance", "United Insurance", "Nyala Insurance"]),
                "insurance_policy_number": f"POL{random.randint(100000, 999999)}",
                "insurance_expiry_date": ins_exp_date.isoformat(),
                "insurance_status": ins_status,
                "engine_capacity": random.choice(["1.5L", "2.0L", "2.5L", "3.0L", "3.5L", "4.0L", "5.0L"]),
                "fuel_type": random.choice(fuel_types),
                "transmission_type": random.choice(transmission_types),
                "seating_capacity": random.choice([2, 4, 5, 7, 8, 14]),
                "is_stolen": is_stolen,
                "is_wanted": is_wanted,
                "has_violations": has_violations,
                "violation_count": random.randint(1, 5) if has_violations else 0,
                "outstanding_fines": f"{random.randint(500, 5000)} ETB" if has_violations else None,
                "notes": "Mock data for testing" if random.random() < 0.3 else None,
                "is_verified": True,
                "last_inspection_date": (date.today() - timedelta(days=random.randint(30, 365))).isoformat(),
                "next_inspection_date": (date.today() + timedelta(days=random.randint(30, 365))).isoformat(),
            }
            
            mock_vehicles.append(vehicle)
        
        return mock_vehicles

    async def search_vehicle(self, search_request: VehicleSearchRequest) -> VehicleSearchResponse:
        """Search for vehicles in the Transport Bureau database"""
        
        if self.use_mock:
            return await self._search_mock_data(search_request)
        else:
            return await self._search_real_api(search_request)

    async def _search_mock_data(self, search_request: VehicleSearchRequest) -> VehicleSearchResponse:
        """Search mock vehicle data"""
        import time
        start_time = time.time()
        
        query_type = search_request.query_type
        query_value = search_request.query_value.upper()
        
        matches = []
        
        for vehicle in self._mock_data:
            match_score = 0.0
            match_found = False
            
            if query_type == "plate_number":
                if vehicle["plate_number"].upper() == query_value:
                    match_score = 1.0
                    match_found = True
                elif query_value in vehicle["plate_number"].upper():
                    match_score = 0.8
                    match_found = True
            
            elif query_type == "vin_number":
                if vehicle["vin_number"] == query_value:
                    match_score = 1.0
                    match_found = True
            
            elif query_type == "owner_name":
                if query_value.lower() in vehicle["owner_name"].lower():
                    match_score = 0.85
                    match_found = True
            
            elif query_type == "owner_national_id":
                if vehicle["owner_national_id"] == query_value:
                    match_score = 1.0
                    match_found = True
            
            if match_found and match_score >= search_request.confidence_threshold:
                # Determine confidence level
                if match_score >= 0.9:
                    confidence = "High"
                elif match_score >= 0.7:
                    confidence = "Medium"
                else:
                    confidence = "Low"
                
                matches.append({
                    "vehicle": vehicle,
                    "confidence_score": confidence,
                    "match_type": query_type,
                    "match_details": {
                        "query_type": query_type,
                        "query_value": query_value,
                        "numeric_score": match_score
                    }
                })
        
        end_time = time.time()
        search_time_ms = int((end_time - start_time) * 1000)
        
        return VehicleSearchResponse(
            success=True,
            message=f"Found {len(matches)} vehicle(s) matching the query",
            matches=matches,
            search_time_ms=search_time_ms
        )

    async def _search_real_api(self, search_request: VehicleSearchRequest) -> VehicleSearchResponse:
        """Search real Transport Bureau API (to be implemented)"""
        # TODO: Implement real API integration
        return VehicleSearchResponse(
            success=False,
            message="Real Transport Bureau API not yet configured",
            matches=[]
        )

    async def populate_mock_data_to_db(self, db: Session):
        """Populate database with mock vehicle registration data"""
        for vehicle_data in self._mock_data:
            # Check if vehicle already exists
            existing = vehicle_registration.get_by_plate_number(db, vehicle_data["plate_number"])
            if not existing:
                # Convert string dates to date objects
                vehicle_data["registration_date"] = date.fromisoformat(vehicle_data["registration_date"])
                vehicle_data["expiry_date"] = date.fromisoformat(vehicle_data["expiry_date"])
                vehicle_data["insurance_expiry_date"] = date.fromisoformat(vehicle_data["insurance_expiry_date"])
                vehicle_data["last_inspection_date"] = date.fromisoformat(vehicle_data["last_inspection_date"])
                vehicle_data["next_inspection_date"] = date.fromisoformat(vehicle_data["next_inspection_date"])
                
                vehicle_create = VehicleRegistrationCreate(**vehicle_data)
                vehicle_registration.create(db, obj_in=vehicle_create)

    def configure_real_api(self, api_url: str, api_key: str):
        """Configure real Transport Bureau API"""
        self.api_url = api_url
        self.api_key = api_key
        self.use_mock = False

    def switch_to_mock(self):
        """Switch back to mock data"""
        self.use_mock = True


# Singleton instance
vehicle_registration_service = VehicleRegistrationService()
