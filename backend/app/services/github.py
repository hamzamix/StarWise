import httpx
from fastapi import Response
from app.core.config import settings

GITHUB_API_URL = "https://api.github.com"
GITHUB_OAUTH_URL = "https://github.com/login/oauth"

def get_oauth_redirect():
    redirect_url = f"{GITHUB_OAUTH_URL}/authorize?client_id={settings.GITHUB_CLIENT_ID}&scope=repo read:user"
    return Response(status_code=303, headers={"Location": redirect_url})

async def get_access_token(code: str):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{GITHUB_OAUTH_URL}/access_token",
            params={
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code": code,
            },
            headers={"Accept": "application/json"},
        )
        response.raise_for_status()
        return response.json()

async def get_github_user_data(token: str):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{GITHUB_API_URL}/user",
            headers={
                "Authorization": f"token {token}",
                "Accept": "application/vnd.github.v3+json",
            },
        )
        response.raise_for_status()
        return response.json()

async def get_starred_repos(token: str):
    starred = []
    page = 1
    async with httpx.AsyncClient() as client:
        while True:
            response = await client.get(
                f"{GITHUB_API_URL}/user/starred",
                headers={
                    "Authorization": f"token {token}",
                    "Accept": "application/vnd.github.v3+json",
                },
                params={"per_page": 100, "page": page},
            )
            response.raise_for_status()
            data = response.json()
            if not data:
                break
            starred.extend(data)
            page += 1
    return starred
