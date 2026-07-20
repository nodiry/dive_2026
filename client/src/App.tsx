import { Route, Routes } from "react-router";
import { PageShell } from "./components/PageShell";
import { About } from "./pages/About";
import { Detail } from "./pages/Detail";
import { Explore } from "./pages/Explore";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Explore />} />
      <Route element={<PageShell />}>
        <Route path="about" element={<About />} />
        <Route path="housing/:id" element={<Detail />} />
      </Route>
    </Routes>
  );
}
