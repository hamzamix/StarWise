import google.generativeai as genai
import json
from app.core.config import settings
from app.db import models

genai.configure(api_key=settings.GEMINI_API_KEY)

async def suggest_tags_for_repo(repo: models.Repository) -> list[str]:
    prompt = f"""
    Analyze the following GitHub repository metadata and suggest 3-5 relevant, concise, single-word or two-word (kebab-case) tags.
    Tags should be lowercase and highly relevant to the project's purpose, technology, and domain.
    Do not suggest generic tags like 'app', 'tool', or 'project'.
    Focus on specific technologies (e.g., 'react', 'fastapi', 'docker'), concepts (e.g., 'data-visualization', 'machine-learning'), or domains (e.g., 'home-automation', 'game-development').

    Repository Name: {repo.name}
    Full Name: {repo.full_name}
    Description: {repo.description or 'No description provided.'}
    Language: {repo.language or 'Not specified.'}

    Return a JSON object with a single key "tags" which is an array of strings. For example: {{"tags": ["react", "data-visualization", "d3"]}}
    """
    
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    try:
        response = await model.generate_content_async(
            prompt,
            generation_config=genai.types.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.3
            )
        )
        
        result = json.loads(response.text)
        
        if result and isinstance(result.get('tags'), list):
            return [str(tag).lower() for tag in result['tags']]

        return []

    except Exception as e:
        print(f"Error generating tags with Gemini API: {e}")
        raise Exception("Failed to get suggestions from AI model.")
