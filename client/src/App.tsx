import { MotionConfig } from 'motion/react';
import { Route, Routes } from 'react-router-dom';
import { ToastList } from '@components/ToastList';
import { ROUTES } from '@constants/path';
import { useAuthBootstrap } from '@hooks/useAuth';
import { PageShell } from '@layout/PageShell';
import { About } from '@pages/About';
import { AiSearch } from '@pages/AiSearch';
import { Detail } from '@pages/Detail';
import { Explore } from '@pages/Explore';
import { LifeMatch } from '@pages/LifeMatch';
import { Login } from '@pages/Login';
import { Policy } from '@pages/Policy';
import { Signup } from '@pages/Signup';

export default function App() {
  useAuthBootstrap();

  return (
    <MotionConfig>
      <Routes>
        <Route
          path={ROUTES.Root}
          element={<Explore />}
        />
        <Route element={<PageShell />}>
          <Route
            path={ROUTES.About}
            element={<About />}
          />
          <Route
            path={ROUTES.HousingDetail}
            element={<Detail />}
          />
          <Route
            path={ROUTES.LifeMatch}
            element={<LifeMatch />}
          />
          <Route
            path={ROUTES.Policy}
            element={<Policy />}
          />
          <Route
            path={ROUTES.Login}
            element={<Login />}
          />
          <Route
            path={ROUTES.Signup}
            element={<Signup />}
          />
          <Route
            path={ROUTES.AiSearch}
            element={<AiSearch />}
          />
        </Route>
      </Routes>
      <ToastList />
    </MotionConfig>
  );
}
