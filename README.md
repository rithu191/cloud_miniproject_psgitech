# CloudPulse — Multi-Cloud Cost & Waste Monitor

CloudPulse is a cloud resource monitoring platform designed to track resource inventory, visualize cost usage, identify potentially idle resources, and alert users when configurable budget thresholds are reached.

## Planned Technology Stack

* Frontend: React and Vite
* Backend: Python and FastAPI
* Database: SQLite with SQLAlchemy
* Cloud integration: AWS SDK for Python (Boto3)
* Testing: pytest
* CI/CD: GitHub and Jenkins
* Containerization: Docker

## Planned Features

* Resource inventory dashboard
* Cost and utilization visualizations
* Configurable budget thresholds
* Rule-based idle-resource detection
* Persistent alerts
* Read-only cloud resource integration

**Project status:** Initial setup. Features and integrations will be implemented and tested incrementally.

**Safety:** CloudPulse is intended for read-only monitoring. It will not automatically stop or delete cloud resources.
