import axios from "axios";

const API_URL = "http://127.0.0.1:8000/chat";

export const sendMessageToBot = async (message) => {
  try {
    const response = await axios.post(API_URL, { message });
    return response.data;
  } catch (error) {
    console.error("Error communicating with chatbot:", error);
    return { reply: "Oops! Something went wrong." };
  }
};
