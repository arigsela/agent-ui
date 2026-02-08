from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    kagent_controller_url: str = "http://localhost:8083"
    kagent_agent_url_template: str = "http://{name}.kagent.svc.cluster.local:8080"
    cors_origins: list[str] = ["http://localhost:5173"]
    agent_cache_ttl_seconds: int = 60

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
