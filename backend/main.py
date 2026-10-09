
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, String, Float, Boolean
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

BASE_DIR = Path(__file__).resolve().parent
DATABASE_URL = f"sqlite:///{BASE_DIR / 'cloudpulse.db'}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(bind=engine)


class Base(DeclarativeBase):
    pass


class Resource(Base):
    __tablename__ = "resources"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100))
    provider: Mapped[str] = mapped_column(String(30), default="Demo")
    service: Mapped[str] = mapped_column(String(50))
    region: Mapped[str] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(30), default="running")
    utilization: Mapped[float] = mapped_column(Float, default=0)
    monthly_cost: Mapped[float] = mapped_column(Float, default=0)
    idle: Mapped[bool] = mapped_column(Boolean, default=False)


class Budget(Base):
    __tablename__ = "budgets"

    id: Mapped[int] = mapped_column(primary_key=True)
    monthly_limit: Mapped[float] = mapped_column(Float, default=1000)


Base.metadata.create_all(bind=engine)

app = FastAPI(title="CloudPulse API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://clause-cloudpulse.vercel.app",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def seed_demo_data():
    with SessionLocal() as db:
        if db.query(Resource).count() == 0:
            db.add_all([
                Resource(
                    name="web-server-01",
                    service="EC2",
                    region="ap-south-1",
                    utilization=42,
                    monthly_cost=320,
                    idle=False
                ),
                Resource(
                    name="dev-server-02",
                    service="EC2",
                    region="ap-south-1",
                    utilization=3,
                    monthly_cost=180,
                    idle=True
                ),
                Resource(
                    name="app-storage",
                    service="S3",
                    region="ap-south-1",
                    utilization=65,
                    monthly_cost=90,
                    idle=False
                ),
                Resource(
                    name="test-database",
                    service="RDS",
                    region="ap-south-1",
                    utilization=8,
                    monthly_cost=240,
                    idle=False
                ),
            ])

        if db.query(Budget).count() == 0:
            db.add(Budget(monthly_limit=1000))

        db.commit()


seed_demo_data()


class BudgetUpdate(BaseModel):
    monthly_limit: float = Field(gt=0)


@app.get("/")
def root():
    return {
        "message": "CloudPulse API is running",
        "docs": "/docs"
    }


@app.get("/api/overview")
def get_overview():
    with SessionLocal() as db:
        resources = db.query(Resource).all()
        budget = db.query(Budget).first()

        total_cost = sum(r.monthly_cost for r in resources)
        total = len(resources)
        idle_count = sum(r.idle for r in resources)
        limit = budget.monthly_limit if budget else 1000

        return {
            "total_monthly_cost": round(total_cost, 2),
            "total_resources": total,
            "idle_resources": idle_count,
            "budget_limit": limit,
            "budget_usage_percent": round(total_cost / limit * 100, 2),
            "data_source": "DEMO",
            "last_updated": datetime.now(timezone.utc).isoformat(),
        }


@app.get("/api/resources")
def get_resources():
    with SessionLocal() as db:
        resources = db.query(Resource).order_by(Resource.id).all()

        return [
            {
                "id": r.id,
                "name": r.name,
                "provider": r.provider,
                "service": r.service,
                "region": r.region,
                "status": r.status,
                "utilization": r.utilization,
                "monthly_cost": r.monthly_cost,
                "idle": r.idle,
            }
            for r in resources
        ]


@app.get("/api/budgets")
def get_budget():
    with SessionLocal() as db:
        budget = db.query(Budget).first()

        return {
            "monthly_limit": budget.monthly_limit if budget else 1000
        }


@app.put("/api/budgets")
def update_budget(payload: BudgetUpdate):
    with SessionLocal() as db:
        budget = db.query(Budget).first()

        if budget is None:
            budget = Budget(monthly_limit=payload.monthly_limit)
            db.add(budget)
        else:
            budget.monthly_limit = payload.monthly_limit

        db.commit()
        db.refresh(budget)

        return {"monthly_limit": budget.monthly_limit}
