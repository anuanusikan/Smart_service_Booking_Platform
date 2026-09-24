import { Link } from 'react-router-dom';

function Home() {
  const categories = [
    { name: 'Plumbing', icon: '🔧' },
    { name: 'Electrical', icon: '⚡' },
    { name: 'Cleaning', icon: '🧹' },
    { name: 'Handyman', icon: '🛠️' },
  ];

  return (
    <>
      <div className="hero">
        <div className="hero-inner">
          <h1>Find Trusted Professionals<br />for Any Project</h1>
          <p>From emergency plumbing to a complete home renovation, connect with top-rated local experts ready to help you get the job done right.</p>

          <div className="toggle-slider">
            <Link to="/register" className="active-need">Need Service</Link>
            <Link to="/register" className="active-provide">Provide Service</Link>
          </div>
        </div>
      </div>

      <div className="section">
        <h2 className="section-title">Popular Services</h2>
        <p className="section-subtitle">Explore highly requested categories</p>
        <div className="category-grid">
          {categories.map((cat) => (
            <Link key={cat.name} to={`/jobs?category=${cat.name}`} className="category-card" style={{ textDecoration: 'none' }}>
              <div className="category-icon">{cat.icon}</div>
              <p>{cat.name}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="footer">
        <div>
          <div className="footer-brand">ServiceSync</div>
          <p>© 2026 ServiceSync Marketplace. All rights reserved.</p>
        </div>
        <div className="footer-links">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="#">Trust &amp; Safety</a>
          <a href="#">Contact Support</a>
        </div>
      </div>
    </>
  );
}

export default Home;