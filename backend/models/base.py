from typing import Any, Optional
from bson import ObjectId
from pydantic import BaseModel, Field, field_serializer, GetCoreSchemaHandler
from pydantic.json_schema import GetJsonSchemaHandler, JsonSchemaValue
from pydantic_core import core_schema

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    # Pydantic v2: define how this custom type is validated and JSON-schema'd
    @classmethod
    def __get_pydantic_core_schema__(
        cls, source_type: Any, handler: GetCoreSchemaHandler
    ) -> core_schema.CoreSchema:
        # Base schema is a string, validated by our validate() returning an ObjectId
        return core_schema.no_info_after_validator_function(
            cls.validate,
            core_schema.str_schema(),
        )

    @classmethod
    def __get_pydantic_json_schema__(
        cls, core_schema_: core_schema.CoreSchema, handler: GetJsonSchemaHandler
    ) -> JsonSchemaValue:
        json_schema = handler(core_schema_)
        # Represent as a string with 24-hex pattern for ObjectId
        if isinstance(json_schema, dict):
            json_schema.update({
                "type": "string",
                "pattern": "^[a-fA-F0-9]{24}$",
                "examples": ["507f1f77bcf86cd799439011"],
            })
        return json_schema

class BaseMongoModel(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        json_schema_extra = {
            "example": {
                "id": "60d5ec9f8679a8e5d1f8c8d9",
                "created_at": "2023-01-01T00:00:00",
                "updated_at": "2023-01-01T00:00:00"
            }
        }

    @field_serializer('id')
    def serialize_id(self, id: PyObjectId, _info) -> str:
        return str(id) if id else None

    @property
    def id_str(self) -> Optional[str]:
        return str(self.id) if self.id else None
