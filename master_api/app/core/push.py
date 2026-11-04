import httpx
from typing import List, Dict, Any

async def send_push_notification(expo_push_token: str, title: str, body: str, data: Dict[str, Any] = None):
    """
    Sends a push notification utilizing Expo's official push API.
    """
    if not expo_push_token:
        return
        
    message = {
        "to": expo_push_token,
        "sound": "default",
        "title": title,
        "body": body,
        "data": data or {}
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "https://exp.host/--/api/v2/push/send",
                json=message,
                headers={
                    "Accept": "application/json",
                    "Accept-encoding": "gzip, deflate",
                    "Content-Type": "application/json"
                }
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error sending push notification to {expo_push_token}: {e}")
            return None
