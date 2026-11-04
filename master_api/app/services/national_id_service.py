"""
National ID Integration Service

This service handles integration with National ID databases.
Currently implements a mock API that simulates government National ID service.
Designed to be easily replaceable with real government API later.
"""

import asyncio
import random
import time
from typing import List, Dict, Any, Optional
from datetime import date, datetime, timedelta
import httpx
import base64
import json
from sqlalchemy.orm import Session

from app.models.national_id import NationalIdProfile
from app.crud.crud_national_id import national_id_profile as crud_national_id
from app.schemas.national_id import NationalIdSearchRequest, NationalIdSearchResponse


class MockNationalIdAPI:
    """
    Mock National ID API that simulates government database responses.
    This will be replaced with real government API integration later.
    """
    
    def __init__(self):
        self.base_url = "http://localhost:8000/api/mock/national-id"  # Mock endpoint
        self.api_key = "mock-api-key-12345"
        self.timeout = 30.0
        
        # Mock database of National ID profiles
        self.mock_profiles = self._generate_mock_profiles()
    
    def _generate_mock_profiles(self) -> List[Dict[str, Any]]:
        """Generate realistic mock National ID profiles"""
        
        # Ethiopian names and regions for realistic data
        first_names = [
            "Abebe", "Almaz", "Bekele", "Chaltu", "Dawit", "Emebet", "Fekadu", "Genet",
            "Haile", "Iyasu", "Kassa", "Lemlem", "Meron", "Negash", "Olana", "Rahel",
            "Samuel", "Tigist", "Wondwossen", "Yohannes", "Zara", "Addisu", "Birtukan",
            "Desta", "Eyob", "Frehiwot", "Girma", "Hanan", "Ibrahim", "Kidist"
        ]
        
        last_names = [
            "Tadesse", "Kebede", "Tesfaye", "Wolde", "Getachew", "Mulugeta", "Assefa",
            "Bekele", "Demissie", "Girma", "Hailu", "Mengistu", "Negash", "Sisay",
            "Teshome", "Worku", "Yimer", "Zeleke", "Abera", "Desta", "Fanta", "Legesse"
        ]
        
        regions = [
            "Addis Ababa", "Oromia", "Amhara", "Tigray", "SNNP", "Somali", 
            "Benishangul-Gumuz", "Gambela", "Harari", "Afar", "Dire Dawa"
        ]
        
        occupations = [
            "Teacher", "Farmer", "Merchant", "Driver", "Engineer", "Doctor", "Nurse",
            "Student", "Government Employee", "Business Owner", "Mechanic", "Tailor",
            "Construction Worker", "Accountant", "Police Officer", "Lawyer", "Chef"
        ]
        
        profiles = []
        
        for i in range(100):  # Generate 100 mock profiles
            first_name = random.choice(first_names)
            last_name = random.choice(last_names)
            middle_name = random.choice(first_names) if random.random() > 0.3 else None
            
            # Generate realistic Ethiopian National ID number
            national_id = f"ET{random.randint(100000, 999999)}{random.randint(1000, 9999)}"
            
            birth_year = random.randint(1960, 2005)
            birth_month = random.randint(1, 12)
            birth_day = random.randint(1, 28)
            
            profile = {
                "id": f"nid-{i+1:03d}",
                "national_id_number": national_id,
                "full_name": f"{first_name} {middle_name + ' ' if middle_name else ''}{last_name}",
                "first_name": first_name,
                "middle_name": middle_name,
                "last_name": last_name,
                "gender": random.choice(["Male", "Female"]),
                "date_of_birth": date(birth_year, birth_month, birth_day),
                "nationality": "Ethiopian",
                "address": f"{random.randint(1, 999)} {random.choice(['Kebele', 'Woreda', 'Street'])} {random.randint(1, 50)}",
                "region": random.choice(regions),
                "city": random.choice(["Addis Ababa", "Bahir Dar", "Mekelle", "Hawassa", "Adama", "Gondar", "Jimma"]),
                "phone_number": f"+251{random.randint(900000000, 999999999)}",
                "email": f"{first_name.lower()}.{last_name.lower()}@email.et" if random.random() > 0.4 else None,
                "occupation": random.choice(occupations),
                "status": random.choice(["active"] * 8 + ["inactive", "suspended"]),  # Mostly active
                "registration_date": date(birth_year + 18, random.randint(1, 12), random.randint(1, 28)),
                "expiry_date": date(2030, random.randint(1, 12), random.randint(1, 28)),
                "issuing_authority": "Ethiopian National ID Authority",
                "emergency_contact_name": f"{random.choice(first_names)} {random.choice(last_names)}",
                "emergency_contact_phone": f"+251{random.randint(900000000, 999999999)}",
                "emergency_contact_relationship": random.choice(["Spouse", "Parent", "Sibling", "Child", "Friend"]),
                "profile_photo_url": f"/mock-photos/profile_{i+1:03d}.jpg",
                "additional_info": {
                    "blood_type": random.choice(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]),
                    "height": f"{random.randint(150, 190)} cm",
                    "eye_color": random.choice(["Brown", "Black", "Hazel"]),
                    "marital_status": random.choice(["Single", "Married", "Divorced", "Widowed"])
                },
                "is_verified": True,
                "verification_date": datetime.now() - timedelta(days=random.randint(1, 365))
            }
            profiles.append(profile)
        
        return profiles
    
    async def search_by_id_number(self, national_id_number: str) -> NationalIdSearchResponse:
        """Search National ID database by ID number"""
        start_time = time.time()
        
        # Simulate API delay
        await asyncio.sleep(random.uniform(0.5, 2.0))
        
        matches = []
        for profile in self.mock_profiles:
            if profile["national_id_number"] == national_id_number:
                matches.append({
                    "profile": profile,
                    "confidence_score": "High",
                    "match_type": "id_number",
                    "match_details": {
                        "exact_match": True,
                        "verification_status": "verified"
                    }
                })
                break
        
        search_time_ms = int((time.time() - start_time) * 1000)
        
        return NationalIdSearchResponse(
            success=True,
            matches=matches,
            total_matches=len(matches),
            search_time_ms=search_time_ms,
            message="ID number search completed" if matches else "No matching ID found"
        )
    
    async def search_by_name(self, name_query: str) -> NationalIdSearchResponse:
        """Search National ID database by name"""
        start_time = time.time()
        
        # Simulate API delay
        await asyncio.sleep(random.uniform(0.8, 1.5))
        
        matches = []
        name_lower = name_query.lower()
        
        for profile in self.mock_profiles:
            # Check if name matches (fuzzy matching)
            full_name_lower = profile["full_name"].lower()
            first_name_lower = profile["first_name"].lower()
            last_name_lower = profile["last_name"].lower()
            
            confidence = "Low"
            match_score = 0
            
            if name_lower in full_name_lower or full_name_lower in name_lower:
                match_score = 0.9
                confidence = "High"
            elif name_lower in first_name_lower or name_lower in last_name_lower:
                match_score = 0.7
                confidence = "Medium"
            elif any(word in full_name_lower for word in name_lower.split()):
                match_score = 0.5
                confidence = "Low"
            
            if match_score > 0.4:  # Minimum threshold
                matches.append({
                    "profile": profile,
                    "confidence_score": confidence,
                    "match_type": "name_search",
                    "match_details": {
                        "match_score": match_score,
                        "query": name_query,
                        "matched_field": "full_name"
                    }
                })
        
        # Sort by confidence and limit results
        matches.sort(key=lambda x: x["match_details"]["match_score"], reverse=True)
        matches = matches[:10]  # Limit to top 10 matches
        
        search_time_ms = int((time.time() - start_time) * 1000)
        
        return NationalIdSearchResponse(
            success=True,
            matches=matches,
            total_matches=len(matches),
            search_time_ms=search_time_ms,
            message=f"Found {len(matches)} name matches"
        )
    
    async def search_by_face_embedding(
        self, 
        face_embedding: List[float], 
        confidence_threshold: float = 0.7
    ) -> NationalIdSearchResponse:
        """
        Search National ID database by face embedding (biometric matching)
        This is a mock implementation - real implementation would use actual face matching
        """
        start_time = time.time()
        
        # Simulate longer processing time for face matching
        await asyncio.sleep(random.uniform(2.0, 4.0))
        
        matches = []
        
        # Mock face matching logic - randomly select some profiles as potential matches
        # In real implementation, this would use actual face recognition algorithms
        potential_matches = random.sample(self.mock_profiles, min(5, len(self.mock_profiles)))
        
        for profile in potential_matches:
            # Simulate confidence scores based on mock similarity
            confidence_score = random.uniform(0.3, 0.95)
            
            if confidence_score >= confidence_threshold:
                confidence_level = "High" if confidence_score >= 0.85 else "Medium" if confidence_score >= 0.7 else "Low"
                
                matches.append({
                    "profile": profile,
                    "confidence_score": confidence_level,
                    "match_type": "face_recognition",
                    "match_details": {
                        "similarity_score": round(confidence_score, 3),
                        "algorithm": "mock_face_recognition_v1",
                        "embedding_dimension": len(face_embedding),
                        "threshold_used": confidence_threshold
                    }
                })
        
        # Sort by similarity score
        matches.sort(key=lambda x: x["match_details"]["similarity_score"], reverse=True)
        
        search_time_ms = int((time.time() - start_time) * 1000)
        
        return NationalIdSearchResponse(
            success=True,
            matches=matches,
            total_matches=len(matches),
            search_time_ms=search_time_ms,
            message=f"Face recognition completed - {len(matches)} matches above threshold"
        )


class NationalIdIntegrationService:
    """
    Main service class for National ID integration.
    Handles both mock and real API integration.
    """
    
    def __init__(self):
        self.mock_api = MockNationalIdAPI()
        self.use_mock = True  # Switch to False when real API is available
        self.real_api_url = None  # Will be set when real API is configured
        self.real_api_key = None
    
    async def search_national_id(
        self, 
        request: NationalIdSearchRequest
    ) -> NationalIdSearchResponse:
        """
        Main entry point for National ID searches.
        Routes to mock or real API based on configuration.
        """
        
        if self.use_mock:
            return await self._search_mock_api(request)
        else:
            return await self._search_real_api(request)
    
    async def _search_mock_api(self, request: NationalIdSearchRequest) -> NationalIdSearchResponse:
        """Handle search using mock API"""
        
        try:
            if request.query_type == "id_number":
                return await self.mock_api.search_by_id_number(request.query_value)
            
            elif request.query_type == "name":
                return await self.mock_api.search_by_name(request.query_value)
            
            elif request.query_type == "face_embedding":
                # Parse face embedding from base64 or JSON
                try:
                    if request.query_value.startswith('['):
                        # JSON array format
                        face_embedding = json.loads(request.query_value)
                    else:
                        # Assume base64 encoded image - would need face extraction
                        # For mock, just use dummy embedding
                        face_embedding = [0.0] * 512
                    
                    return await self.mock_api.search_by_face_embedding(
                        face_embedding, 
                        request.confidence_threshold or 0.7
                    )
                except Exception as e:
                    return NationalIdSearchResponse(
                        success=False,
                        message=f"Invalid face embedding format: {str(e)}"
                    )
            
            else:
                return NationalIdSearchResponse(
                    success=False,
                    message=f"Unsupported query type: {request.query_type}"
                )
        
        except Exception as e:
            return NationalIdSearchResponse(
                success=False,
                message=f"Mock API error: {str(e)}"
            )
    
    async def _search_real_api(self, request: NationalIdSearchRequest) -> NationalIdSearchResponse:
        """Handle search using real government API (placeholder)"""
        
        if not self.real_api_url or not self.real_api_key:
            return NationalIdSearchResponse(
                success=False,
                message="Real National ID API not configured"
            )
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                headers = {
                    "Authorization": f"Bearer {self.real_api_key}",
                    "Content-Type": "application/json"
                }
                
                payload = {
                    "query_type": request.query_type,
                    "query_value": request.query_value,
                    "confidence_threshold": request.confidence_threshold
                }
                
                response = await client.post(
                    f"{self.real_api_url}/search",
                    headers=headers,
                    json=payload
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return NationalIdSearchResponse(**data)
                else:
                    return NationalIdSearchResponse(
                        success=False,
                        message=f"API error: {response.status_code} - {response.text}"
                    )
        
        except httpx.TimeoutException:
            return NationalIdSearchResponse(
                success=False,
                message="National ID API timeout"
            )
        except Exception as e:
            return NationalIdSearchResponse(
                success=False,
                message=f"API connection error: {str(e)}"
            )
    
    def configure_real_api(self, api_url: str, api_key: str):
        """Configure real government API credentials"""
        self.real_api_url = api_url
        self.real_api_key = api_key
        self.use_mock = False
    
    def switch_to_mock(self):
        """Switch back to mock API for testing"""
        self.use_mock = True
    
    async def populate_mock_data_to_db(self, db: Session):
        """
        Populate mock National ID profiles into the database.
        Useful for development and testing.
        """
        
        for profile_data in self.mock_api.mock_profiles:
            # Check if profile already exists
            existing = crud_national_id.get_by_national_id_number(
                db, profile_data["national_id_number"]
            )
            
            if not existing:
                # Convert date strings to date objects if needed
                if isinstance(profile_data["date_of_birth"], str):
                    profile_data["date_of_birth"] = datetime.strptime(
                        profile_data["date_of_birth"], "%Y-%m-%d"
                    ).date()
                
                if isinstance(profile_data["registration_date"], str):
                    profile_data["registration_date"] = datetime.strptime(
                        profile_data["registration_date"], "%Y-%m-%d"
                    ).date()
                
                if isinstance(profile_data["expiry_date"], str):
                    profile_data["expiry_date"] = datetime.strptime(
                        profile_data["expiry_date"], "%Y-%m-%d"
                    ).date()
                
                # Create profile in database
                profile = NationalIdProfile(**profile_data)
                db.add(profile)
        
        db.commit()


# Global service instance
national_id_service = NationalIdIntegrationService()