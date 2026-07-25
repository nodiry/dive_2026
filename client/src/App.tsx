import { MotionConfig } from 'motion/react';
import { Route, Routes } from 'react-router-dom';
import { ToastList } from '@components/ToastList';
import { ROUTES } from '@constants/path';
import { PageShell } from '@layout/PageShell';
import { About } from '@pages/About';
import { Detail } from '@pages/Detail';
import { Explore } from '@pages/Explore';
import { LifeMatch } from '@pages/LifeMatch';
import { Policy } from '@pages/Policy';

export default function App() {
  return (
    <MotionConfig reducedMotion='user'>
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
        </Route>
      </Routes>
      <ToastList />
    </MotionConfig>
  );
}
