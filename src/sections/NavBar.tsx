import { t, UI_COPY, type Locale } from "../data/portfolio";

type NavBarProps = {
  lang: Locale;
  onChangeLang: (lang: Locale) => void;
};

export function NavBar({ lang, onChangeLang }: NavBarProps) {
  return (
    <>
      <a href="#main-content" className="skip-link">
        {t(UI_COPY.skipToMain, lang)}
      </a>

      <header className="top-rail">
        <div className="top-rail-inner">
          <div
            className="lang-switch"
            role="group"
            aria-label={lang === "id" ? "Pilih bahasa" : "Language selector"}
          >
            <button
              type="button"
              className={lang === "id" ? "is-active" : ""}
              aria-pressed={lang === "id"}
              onClick={() => onChangeLang("id")}
            >
              ID
            </button>
            <button
              type="button"
              className={lang === "en" ? "is-active" : ""}
              aria-pressed={lang === "en"}
              onClick={() => onChangeLang("en")}
            >
              EN
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
