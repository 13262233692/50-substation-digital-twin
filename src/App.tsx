import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Home from "@/pages/Home"
import Monitor from "@/pages/Monitor"
import Config from "@/pages/Config"

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/monitor" element={<Monitor />} />
        <Route path="/config" element={<Config />} />
      </Routes>
    </Router>
  )
}
