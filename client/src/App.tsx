import { Route, Routes } from "react-router";
import { Layout } from "./components/Layout";
import { Detail } from "./pages/Detail";
import { Home } from "./pages/Home";
import { Recommend } from "./pages/Recommend";
import { Search } from "./pages/Search";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="search" element={<Search />} />
        <Route path="recommend" element={<Recommend />} />
        <Route path="housing/:id" element={<Detail />} />
      </Route>
    </Routes>
  );
}
