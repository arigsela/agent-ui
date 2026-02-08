import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/layout";
import { ChatPage } from "@/pages/chat-page";
import { CreateAgentPage } from "@/pages/create-agent-page";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<ChatPage />} />
          <Route path="/create-agent" element={<CreateAgentPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
