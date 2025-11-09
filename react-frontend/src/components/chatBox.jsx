import React, { useState, useEffect } from "react";
import { sendMessageToBot } from "../services/chatService";
import "../styles/chatBox.css";

export default function ChatBox() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Load message history from localStorage on component mount
  useEffect(() => {
    const savedMessages = localStorage.getItem('localLinkChatMessages');
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    }
  }, []);

  // Save messages to localStorage whenever messages change
  useEffect(() => {
    localStorage.setItem('localLinkChatMessages', JSON.stringify(messages));
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { 
      sender: "user", 
      text: input, 
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMessage]);

    setIsTyping(true);
    setInput("");

    try {
      const botReply = await sendMessageToBot(input);
      const botMessage = { 
        sender: "bot", 
        text: botReply.reply, 
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = { 
        sender: "bot", 
        text: "Sorry, I'm having trouble connecting. Please try again.", 
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickReply = async (service) => {
    const quickInput = `Tell me about ${service}`;
    setInput(quickInput);
    setTimeout(() => { // Allow state update to process first
      handleSend();
    }, 0);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h3>LocalLink Assistant</h3>
        <p>Connecting campus services and students</p>
      </div>
      
      <div className="messages">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`message ${msg.sender}-message`}
          >
            <div className="avatar">
              {msg.sender === "user" ? "👤" : "🤖"}
            </div>
            <div className="message-content">
              <div className="message-text">{msg.text}</div>
              <div className="message-time">{msg.timestamp}</div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="message bot-message">
            <div className="avatar">🤖</div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="quick-replies">
        <span onClick={() => handleQuickReply("tutoring")} className="quick-reply">Tutoring</span>
        <span onClick={() => handleQuickReply("campus events")} className="quick-reply">Events</span>
        <span onClick={() => handleQuickReply("food services")} className="quick-reply">Food</span>
        <span onClick={() => handleQuickReply("study groups")} className="quick-reply">Study</span>
      </div>

      <div className="input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask LocalLink about services, events, or providers..."
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
}
