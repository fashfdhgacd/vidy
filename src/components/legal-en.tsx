/**
 * English legal/info pages for the English-only build (videqsss.icu). Same URLs as the
 * Indonesian pages (/tentang, /privasi, ...): each route picks these when UI_EN is set.
 * Hand-written English, not machine translation.
 */
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { LegalPage } from "@/components/legal-page";
import { jsonLdString } from "@/lib/json-ld";
import {
  DEFAULT_OG,
  HOME_CANONICAL,
  SITE_NAME,
  SITE_ORIGIN,
  TITLE_SUFFIX,
  breadcrumbJsonLd,
} from "@/lib/seo";

const CONTACT_EMAIL = "dmca@videyy.icu";

function H2({ children }: { children: ReactNode }) {
  return <h2 className="pt-2 text-base font-semibold text-foreground">{children}</h2>;
}

/** <head> for an English info page: title, description, canonical, og, breadcrumb. */
export function legalHeadEn(path: string, title: string, description: string, crumb: string) {
  const url = `${SITE_ORIGIN}${path}`;
  const full = `${title} | ${SITE_NAME}`;
  return {
    meta: [
      { title: full },
      { name: "description", content: description },
      { property: "og:title", content: full },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "en_US" },
      { property: "og:image", content: DEFAULT_OG },
      { name: "robots", content: "index,follow" },
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: [
      {
        type: "application/ld+json",
        children: jsonLdString(
          breadcrumbJsonLd([
            { name: SITE_NAME, url: HOME_CANONICAL },
            { name: crumb, url },
          ]),
        ),
      },
    ],
  };
}

export const EN_LEGAL = {
  about: {
    title: `About ${SITE_NAME}`,
    description: `About ${SITE_NAME} (${TITLE_SUFFIX}): a curated 18+ catalog of Indonesian amateur videos from IndoAV and UserBokep, how to recognise the real site, and how to reach us.`,
  },
  privacy: {
    title: "Privacy Policy",
    description: `${SITE_NAME} privacy policy: the anonymous analytics we keep, the 18+ age-gate cookie, third-party video players, and how to contact us.`,
  },
  terms: {
    title: "Terms of Service",
    description: `${SITE_NAME} terms of service: adults 18+ only, your local laws, third-party content, removals, DMCA, and disclaimers.`,
  },
  contact: {
    title: "Contact",
    description: `Contact ${SITE_NAME} for DMCA notices, removal requests, privacy questions, or broken video links.`,
  },
  dmca: {
    title: "DMCA and Content Removal",
    description: `How rights holders can send a DMCA notice to ${SITE_NAME}: the page URL, proof of ownership, and a good-faith statement.`,
  },
  s2257: {
    title: "18 U.S.C. 2257 Exemption Statement",
    description: `18 U.S.C. 2257 exemption and compliance statement for ${TITLE_SUFFIX}. The operator is not a primary or secondary producer of any content.`,
  },
  friends: {
    title: "Friend Sites & Directories",
    description: `Friend sites and adult directories that list ${SITE_NAME} (${TITLE_SUFFIX}). 18+ only.`,
  },
} as const;

export function AboutEn() {
  return (
    <LegalPage title={EN_LEGAL.about.title}>
      <p>
        <strong>{SITE_NAME}</strong> is the official site at <strong>{TITLE_SUFFIX}</strong>. We
        curate an 18+ catalog of Indonesian amateur videos from IndoAV and UserBokep that you can
        watch straight away on your phone. We are not IndoAV or UserBokep and are not affiliated
        with either.
      </p>
      <H2>The real site vs. copies</H2>
      <p>
        Other sites copy our titles and video lists. The only official address is{" "}
        <a className="underline" href={HOME_CANONICAL}>
          {TITLE_SUFFIX}
        </a>
        . Every video here has its own watch page with the original upload date, and our{" "}
        <a className="underline" href="/rss.xml">
          RSS feed
        </a>{" "}
        records when each video first appeared.
      </p>
      <H2>Start browsing</H2>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <Link className="underline" to="/">
            Newest videos
          </Link>
        </li>
        <li>
          <a className="underline" href="/en">
            Video categories
          </a>
        </li>
      </ul>
      <H2>Content rules</H2>
      <p>
        This site is for visitors aged 18 and over. Everyone shown must be an adult; content
        involving minors is never published. See also the{" "}
        <Link className="underline" to="/2257">
          2257 statement
        </Link>
        ,{" "}
        <Link className="underline" to="/syarat">
          Terms
        </Link>
        , and{" "}
        <Link className="underline" to="/privasi">
          Privacy Policy
        </Link>
        .
      </p>
      <H2>Contact</H2>
      <p>
        For DMCA notices or broken links:{" "}
        <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </LegalPage>
  );
}

export function PrivacyEn() {
  return (
    <LegalPage title={EN_LEGAL.privacy.title}>
      <p className="text-xs text-muted/70">Last updated: 20 November 2026</p>
      <p>
        This policy explains what data is collected when you visit {TITLE_SUFFIX} (&ldquo;
        {SITE_NAME}&rdquo;, &ldquo;the Site&rdquo;) and how it is used. The Site is only for users
        aged 18 or over.
      </p>
      <H2>1. No account needed to watch</H2>
      <p>
        You do not need an account to watch videos, and we do not ask for your name, phone number,
        or payment details. If you choose to create an account to post comments, we keep the email
        address and display name you give us for that purpose only. We do not sell, rent, or share
        personal data with anyone for marketing.
      </p>
      <H2>2. Anonymous analytics</H2>
      <p>
        To understand traffic and improve the Site, we record the following anonymous analytics:
      </p>
      <ul className="list-disc space-y-1 pl-5">
        <li>pages opened (page views) and the time of the visit;</li>
        <li>
          a random, anonymous visitor ID stored in your browser&rsquo;s localStorage (not linked to
          who you are);
        </li>
        <li>device and browser type (derived from the user agent);</li>
        <li>the referrer (the site you came from) and approximate country when available.</li>
      </ul>
      <p>
        This data is stored on Cloudflare infrastructure (D1/KV) and used only as aggregate
        statistics. IP addresses may be processed briefly for rate limiting (anti-spam and anti-bot)
        but are not stored in our analytics database. We may also use a cookieless third-party
        analytics service (Umami) for aggregate statistics.
      </p>
      <H2>3. Cookies and local storage</H2>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>18+ age gate</strong>: the <code>dp_age_ok</code> cookie and a localStorage entry
          remember that you confirmed you are 18 or older, so the gate does not appear on every
          visit (kept for up to one year).
        </li>
        <li>
          <strong>Anonymous visitor ID</strong>: localStorage, used to count unique and online
          visitors.
        </li>
        <li>
          <strong>Poster cache</strong>: a service worker may keep thumbnails in your browser cache
          so pages load faster.
        </li>
      </ul>
      <p>
        You can clear cookies and site data at any time in your browser settings. Thumbnails are
        proxied from approved hosts so posters show without opening the source directly.
      </p>
      <H2>4. Third-party players and services</H2>
      <p>
        Videos play through embedded players from third-party hosting services. When you play a
        video, that service may collect data (including cookies, IP address, and ads) under its own
        privacy policy. We do not control and are not responsible for those practices. Fonts are
        loaded from Google Fonts.
      </p>
      <H2>5. Age of users</H2>
      <p>The Site is not meant for anyone under 18. If you are under 18, leave the Site now.</p>
      <H2>6. Contact</H2>
      <p>
        Privacy questions or data removal requests can be sent through the{" "}
        <Link to="/kontak" className="underline">
          Contact
        </Link>{" "}
        page. See also the{" "}
        <Link to="/syarat" className="underline">
          Terms of Service
        </Link>{" "}
        and the{" "}
        <Link to="/2257" className="underline">
          2257 statement
        </Link>
        .
      </p>
    </LegalPage>
  );
}

export function TermsEn() {
  return (
    <LegalPage title={EN_LEGAL.terms.title}>
      <p className="text-xs text-muted/70">Last updated: 20 November 2026</p>
      <p>
        By accessing or using {TITLE_SUFFIX} (&ldquo;{SITE_NAME}&rdquo;, &ldquo;the Site&rdquo;) you
        agree to these Terms of Service. If you do not agree, do not use the Site.
      </p>
      <H2>1. Adults 18+ only</H2>
      <p>
        The Site contains adult material and is only for users aged at least 18 (or the age of
        majority where you live, whichever is higher). By entering, you confirm that you meet that
        age and are not offended by sexually explicit material.
      </p>
      <H2>2. Your local laws</H2>
      <p>
        You are responsible for making sure that viewing adult material is legal where you are. Do
        not use the Site for anything illegal. The operator may limit or refuse access at any time.
      </p>
      <H2>3. Third-party content</H2>
      <p>
        The Site is a catalog of links and embedded players. We do not produce, upload, or host
        video files. All videos are hosted by third-party services. We do not claim ownership of
        that content, do not control it, and do not guarantee that external sources are available or
        accurate. See the{" "}
        <Link to="/2257" className="underline">
          2257 statement
        </Link>
        .
      </p>
      <H2>4. Prohibited content and removal</H2>
      <p>
        We have zero tolerance for content involving anyone under 18 and for non-consensual content.
        If you find a problem, report it through the{" "}
        <Link to="/kontak" className="underline">
          Contact
        </Link>{" "}
        page with the page URL; reported entries are reviewed and removed from the catalog when they
        break these rules.
      </p>
      <H2>5. Copyright (DMCA)</H2>
      <p>
        Copyright holders can request removal by following the{" "}
        <Link to="/dmca" className="underline">
          DMCA
        </Link>{" "}
        procedure.
      </p>
      <H2>6. Privacy</H2>
      <p>
        How we use data is explained in the{" "}
        <Link to="/privasi" className="underline">
          Privacy Policy
        </Link>
        .
      </p>
      <H2>7. Disclaimer</H2>
      <p>
        The Site is provided &ldquo;as is&rdquo; without any warranty. The operator is not liable
        for any loss arising from use of the Site or from third-party content, ads, or links. These
        Terms may change at any time; the latest version is always on this page.
      </p>
    </LegalPage>
  );
}

export function ContactEn() {
  return (
    <LegalPage title={EN_LEGAL.contact.title}>
      <p>For DMCA notices, privacy questions, or broken links, write to:</p>
      <p>
        <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>
          {CONTACT_EMAIL}
        </a>
      </p>
      <p>Include the page URL and a short summary. Please do not send video files.</p>
    </LegalPage>
  );
}

export function DmcaEn() {
  return (
    <LegalPage title="DMCA">
      <p>
        If you hold the rights to a title and want it removed from the catalog, send a notice
        through the{" "}
        <Link to="/kontak" className="underline">
          Contact
        </Link>{" "}
        page with the watch page URL, proof of ownership, and a good-faith statement.
      </p>
      <p>
        We review complete notices and remove valid catalog entries. We never re-host video files.
      </p>
    </LegalPage>
  );
}

export function Statement2257En() {
  return (
    <LegalPage title={EN_LEGAL.s2257.title}>
      <p className="text-xs text-muted/70">Last updated: 20 November 2026</p>
      <H2>Exemption statement</H2>
      <p>
        {TITLE_SUFFIX} (&ldquo;{SITE_NAME}&rdquo;, &ldquo;the Site&rdquo;) is a catalog/index of
        links and embedded players. The operator of the Site is not a &ldquo;producer&rdquo;
        (primary or secondary) of any of the visual content that may be accessed through the Site,
        as that term is defined in 18 U.S.C. &sect; 2257 and 28 C.F.R. &sect; 75.
      </p>
      <p>
        The Site does not produce, film, commission, upload, or host video files. All videos shown
        on the Site are hosted by, and streamed from, independent third-party video hosting and
        embed services. The Site only displays titles, thumbnails, and links/embeds that point to
        those services. The operator does not exercise editorial control over the content of those
        videos, and its activities are limited to the transmission, storage, retrieval, hosting
        and/or formatting of depictions as described in 18 U.S.C. &sect; 2257(h)(2)(B)(v) and 47
        U.S.C. &sect; 230(c).
      </p>
      <H2>Age of persons depicted</H2>
      <p>
        According to the uploaders and hosting services, all persons who appear in any visual
        depiction accessible through the Site were 18 years of age or older when the depiction was
        created. Records required under 18 U.S.C. &sect; 2257 and 28 C.F.R. &sect; 75, where
        applicable, are kept by the original producers of the content and/or the third-party hosts,
        not by the operator of this Site. Questions about records should go to the original producer
        or host of the specific video.
      </p>
      <H2>Zero-tolerance policy</H2>
      <p>
        The Site has a zero-tolerance policy toward any content involving persons under 18 and
        toward any non-consensual content (including content recorded or shared without the consent
        of the people shown). Any catalog entry reported as violating this policy is removed
        promptly after review, and where appropriate the report is passed to the hosting service
        and/or the relevant authorities.
      </p>
      <H2>Reporting and removal</H2>
      <p>
        To report a video or ask for a catalog entry to be removed, use the{" "}
        <Link to="/kontak" className="underline">
          Contact
        </Link>{" "}
        page and include the full URL of the page on this Site and a short description. Copyright
        notices follow the{" "}
        <Link to="/dmca" className="underline">
          DMCA
        </Link>{" "}
        procedure.
      </p>
    </LegalPage>
  );
}

export function FriendsEn({ links }: { links: ReadonlyArray<{ name: string; href: string }> }) {
  return (
    <LegalPage title={EN_LEGAL.friends.title}>
      <p>
        The sites and directories below list <strong>{TITLE_SUFFIX}</strong>. All of them are for
        visitors aged 18+.
      </p>
      <ul className="space-y-3">
        {links.map((l) => (
          <li key={l.href} className="border border-white/15 p-3">
            <a
              className="font-semibold text-teal-400 underline-offset-2 hover:underline"
              href={l.href}
              target="_blank"
              rel="noopener"
            >
              {l.name}
            </a>
          </li>
        ))}
      </ul>
      <p>
        Run an adult site and want to swap links? Reach us through the{" "}
        <a className="underline" href="/kontak">
          Contact
        </a>{" "}
        page.
      </p>
    </LegalPage>
  );
}
