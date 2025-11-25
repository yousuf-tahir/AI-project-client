from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from db.database import Base

class Skill(Base):
    __tablename__ = "skills"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    
    # Relationship with job criteria
    job_criteria = relationship("JobCriteria", back_populates="skills")

class JobCriteriaSkill(Base):
    __tablename__ = "job_criteria_skills"
    
    job_criteria_id = Column(Integer, ForeignKey("job_criteria.id"), primary_key=True)
    skill_id = Column(Integer, ForeignKey("skills.id"), primary_key=True)
