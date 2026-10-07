import { Link } from 'react-router-dom';
import { Brand } from '../ui/Brand';
export function Footer() {
  return (
    <footer className="public-footer">
      <div className="footer-top">
        <div>
          <Brand light logo />
          <p>Think clearly. Build capability. Make consistent progress.</p>
        </div>
        {[
          [
            'Explore',
            ['The product', '/product'],
            ['How it works', '/how-it-works'],
            ['Your context', '/who-its-for'],
          ],
          [
            'Learn',
            ['Our story', '/about'],
            ['Getting started', '/help/getting-started'],
            ['Help center', '/help'],
          ],
          [
            'Trust',
            ['Human control', '/trust/governance'],
            ['Privacy & data', '/trust/privacy'],
            ['Accessibility', '/accessibility'],
          ],
        ].map(([title, ...links]) => (
          <div className="footer-column" key={title as string}>
            <h3>{title}</h3>
            {(links as string[][]).map(([label, route]) => (
              <Link key={route} to={route}>
                {label}
              </Link>
            ))}
          </div>
        ))}
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} LAMID ONE</span>
        <span>Progress keeps moving. Control stays with you.</span>
        <a href="#top">Back to top ↑</a>
      </div>
    </footer>
  );
}
