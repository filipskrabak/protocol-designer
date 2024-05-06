from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    class Config:
        case_sensitive = True

    DATABASE_HOST: str
    DATABASE_PORT: int
    DATABASE_NAME: str
    DATABASE_USER: str
    DATABASE_PASSWORD: str

settings = Settings()
