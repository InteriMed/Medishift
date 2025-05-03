import React from 'react';
import './Footer.css';

function Footer() {
  return (
    <footer>
      <div className="newsletter">
        <h3>Joignez-vous à la communauté Linky pour ne louper aucune actualité ou mise à jour.</h3>
        <form>
          <input type="email" placeholder="Email" />
          <button type="submit">S&apos;abonner</button>
        </form>
        <p>En souscrivant, vous acceptez notre politique de confidentialité et vous consentez à recevoir des informations de la part de Linky.</p>
      </div>

      <div className="footer-links">
        <div className="column">
          <h4>Entreprises</h4>
          <ul>
            <li>Pharmacie officine</li>
            <li>Pharmacie hospitalière</li>
            <li>Clinique</li>
            <li>Soon</li>
            <li>EPHAD</li>
            <li>Soon</li>
            <li>FAQ Entreprise</li>
          </ul>
        </div>
        <div className="column">
          <h4>Intérimaires</h4>
          <ul>
            <li>Docteur en pharmacie</li>
            <li>Préparateur en pharmacie</li>
            <li>Étudiant en pharmacie</li>
            <li>Infirmier</li>
            <li>Soon</li>
            <li>Aide-soignant</li>
            <li>Soon</li>
            <li>FAQ Candidat</li>
          </ul>
        </div>
        <div className="column">
          <h4>Pratique</h4>
          <ul>
            <li>À propos</li>
            <li>On recrute 🚀</li>
            <li>Presse</li>
            <li>Salaires en officine</li>
            <li>CGU</li>
            <li>Contact</li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© 2024 Linky | <a href="#">Mentions légales</a></p>
      </div>
    </footer>
  );
}

export default Footer;
