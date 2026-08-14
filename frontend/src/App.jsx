import { Navigate, Route, Routes } from 'react-router-dom';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { MovieProvider } from './context/MovieContext';
import { Dashboard } from './pages/Dashboard';
import { Home } from './pages/Home';
import { Movie } from './pages/Movie';

export function App() {
  return (
    <MovieProvider>
      <div className="flex min-h-dvh flex-col">
        <Header />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/studio" element={<Dashboard />} />
            <Route path="/movie" element={<Movie />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </MovieProvider>
  );
}
