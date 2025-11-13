import React, { useState, useEffect, useRef, forwardRef } from "react";
import { sendMessageToBot } from "../services/chatService";
import "../styles/chatBox.css";

const MessagesContainer = forwardRef(({ children, onScroll }, ref) => (
  <div className="messages" ref={ref} onScroll={onScroll}>
    {children}
  </div>
));

const Message = forwardRef(({ msg }, ref) => (
  <div
    ref={ref}
    className={`message ${msg.sender}-message`}
  >
    <div className="avatar">
      {msg.sender === "user" ? "👤" : "🤖"}
    </div>
    <div className="message-content">
      <div className="message-text" dangerouslySetInnerHTML={{ __html: msg.text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>') }}></div>
      <div className="message-time">{msg.timestamp}</div>
    </div>
  </div>
));

export default function ChatBox() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Theme toggle handler
  const toggleTheme = () => {
    setIsDarkTheme(!isDarkTheme);
    document.documentElement.setAttribute('data-theme', !isDarkTheme ? 'dark' : 'light');
  };

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
    scrollToBottom();
  }, [messages]);

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isScrolledUp = scrollTop < scrollHeight - clientHeight - 100;
      setShowScrollToBottom(isScrolledUp);
    }
  };

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

  const handleQuickReply = (service) => {
    setInput(`Tell me about ${service}`);
    setTimeout(() => {
      document.querySelector('.input-area button').click();
    }, 100);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="avatar">🤖</div>
        <div className="header-content">
          <h3>LocalLink Assistant</h3>
          <p className="status-indicator">Online</p>
          <p className="header-subtitle">Your gateway to campus services & opportunities</p>
        </div>
        <button 
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${isDarkTheme ? 'light' : 'dark'} theme`}
        >
          {isDarkTheme ? '🌞' : '🌙'}
        </button>
      </div>
      
      <MessagesContainer ref={messagesContainerRef} onScroll={handleScroll}>
        {messages.map((msg, i) => (
          <Message key={i} msg={msg} ref={i === messages.length - 1 ? messagesEndRef : null} />
        ))}
        {isTyping && (
          <div className="message bot-message typing-message">
            <div className="avatar">🤖</div>
            <div className="message-content">
              <div className="typing-indicator">
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </MessagesContainer>

      {showScrollToBottom && (
        <div className="scroll-to-bottom" onClick={scrollToBottom}>
          ⬇️
        </div>
      )}

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
          placeholder="Ask LocalLink..."
        />
        <button onClick={handleSend}>➢</button>
      </div>
    </div>
  );
}
