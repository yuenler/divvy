import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ReceiptScanner } from './pages/ReceiptScanner';
import { BalanceOverview } from './pages/BalanceOverview';
import { History } from './pages/History';
import { Navigation } from './components/Navigation';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="pb-20">
          <Routes>
            <Route path="/" element={<ReceiptScanner />} />
            <Route path="/balance" element={<BalanceOverview />} />
            <Route path="/history" element={<History />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
