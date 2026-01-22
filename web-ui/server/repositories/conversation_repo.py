from sqlalchemy.orm import Session
from models.conversation import Conversation, Message
from datetime import datetime
import uuid

class ConversationRepository:
    def __init__(self, db: Session):
        self.db = db
    
    def get_by_project(self, project_id: str) -> list[Conversation]:
        return self.db.query(Conversation)\
            .filter(Conversation.project_id == project_id)\
            .order_by(Conversation.updated_at.desc().nullsfirst())\
            .all()
    
    def get_by_id(self, id: str) -> Conversation | None:
        return self.db.query(Conversation).filter(Conversation.id == id).first()
    
    def create(self, project_id: str, agent: str, title: str | None = None) -> Conversation:
        conv = Conversation(
            id=str(uuid.uuid4()),
            project_id=project_id,
            agent=agent,
            title=title
        )
        self.db.add(conv)
        self.db.commit()
        self.db.refresh(conv)
        return conv
    
    def update_title(self, id: str, title: str):
        conv = self.get_by_id(id)
        if conv:
            conv.title = title
            conv.updated_at = datetime.utcnow()
            self.db.commit()
    
    def get_messages(self, conversation_id: str) -> list[Message]:
        return self.db.query(Message)\
            .filter(Message.conversation_id == conversation_id)\
            .order_by(Message.created_at)\
            .all()
    
    def add_message(self, conversation_id: str, role: str, content: str, **kwargs) -> Message:
        msg = Message(
            id=str(uuid.uuid4()),
            conversation_id=conversation_id,
            role=role,
            content=content,
            **kwargs
        )
        self.db.add(msg)
        
        # Update conversation timestamp
        conv = self.get_by_id(conversation_id)
        if conv:
            conv.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(msg)
        return msg
    
    def delete(self, id: str) -> bool:
        # Delete messages first
        self.db.query(Message).filter(Message.conversation_id == id).delete()
        result = self.db.query(Conversation).filter(Conversation.id == id).delete()
        self.db.commit()
        return result > 0
