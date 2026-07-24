import { useEffect, useRef, useState } from 'react';

export default function AnimatedLogo({ size = 160, className = '' }: { size?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [bounce, setBounce] = useState(false);

  // Random periodic bounce for personality
  useEffect(() => {
    const interval = setInterval(() => {
      setBounce(true);
      setTimeout(() => setBounce(false), 400);
    }, 4000 + Math.random() * 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      ref={ref}
      className={`cursor-pointer transition-transform duration-300 select-none ${
        bounce ? 'scale-110' : 'scale-100'
      } ${className}`}
      onClick={() => {
        setBounce(true);
        setTimeout(() => setBounce(false), 400);
      }}
      style={{
        width: size,
        height: size,
        filter: 'drop-shadow(0 0 30px rgba(109,106,246,0.4)) drop-shadow(0 8px 32px rgba(17,0,46,0.6))',
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1024 1024"
        fill="none"
        width="100%"
        height="100%"
      >
        <defs>
          <linearGradient id="ring" x1="176" y1="560" x2="846" y2="398" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#25D9FF" />
            <stop offset=".23" stopColor="#249FFF" />
            <stop offset=".48" stopColor="#7358FF" />
            <stop offset=".70" stopColor="#B841FF" />
            <stop offset=".88" stopColor="#EF39EA" />
            <stop offset="1" stopColor="#FF48D2" />
          </linearGradient>
          <linearGradient id="top" x1="188" y1="470" x2="770" y2="217" gradientUnits="userSpaceOnUse">
            <stop stopColor="#9DF4FF" />
            <stop offset=".35" stopColor="#B8D5FF" />
            <stop offset=".70" stopColor="#EAB6FF" />
            <stop offset="1" stopColor="#FFD8F8" />
          </linearGradient>
          <linearGradient id="seam" x1="270" y1="488" x2="760" y2="488" gradientUnits="userSpaceOnUse">
            <stop stopColor="#54E4FF" />
            <stop offset=".28" stopColor="#7B94FF" />
            <stop offset=".63" stopColor="#B65FFF" />
            <stop offset="1" stopColor="#FF9BED" />
          </linearGradient>
          <radialGradient id="face" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(508 471) rotate(90) scale(275 330)">
            <stop stopColor="#140843" />
            <stop offset=".65" stopColor="#0D0636" />
            <stop offset="1" stopColor="#080427" />
          </radialGradient>
          <linearGradient id="le" x1="400" y1="411" x2="463" y2="528" gradientUnits="userSpaceOnUse">
            <stop stopColor="#C8FBFF" />
            <stop offset=".23" stopColor="#83ECFF" />
            <stop offset=".72" stopColor="#54C9FF" />
            <stop offset="1" stopColor="#6698FF" />
          </linearGradient>
          <linearGradient id="re" x1="571" y1="411" x2="634" y2="528" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFE0FC" />
            <stop offset=".28" stopColor="#FFA0F8" />
            <stop offset=".74" stopColor="#EF68F5" />
            <stop offset="1" stopColor="#D956F2" />
          </linearGradient>
          <linearGradient id="sm" x1="456" y1="575" x2="578" y2="590" gradientUnits="userSpaceOnUse">
            <stop stopColor="#8979FF" />
            <stop offset=".48" stopColor="#AA68FF" />
            <stop offset="1" stopColor="#F979F4" />
          </linearGradient>
          <linearGradient id="st" x1="704" y1="226" x2="824" y2="351" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFF6FF" />
            <stop offset=".25" stopColor="#FFD5FA" />
            <stop offset=".64" stopColor="#FA78EF" />
            <stop offset="1" stopColor="#F42DD8" />
          </linearGradient>
          <filter id="aura" x="-45%" y="-45%" width="190%" height="190%">
            <feGaussianBlur stdDeviation="26" />
          </filter>
          <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          <filter id="shadow" x="-25%" y="-25%" width="150%" height="165%">
            <feDropShadow dx="0" dy="8" stdDeviation="7" floodColor="#11002E" floodOpacity=".72" />
          </filter>
        </defs>

        {/* === FULL ORIGINAL MASCOT === */}
        <g style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
          {/* Purple aura behind body */}
          <path
            d="M728 211 C776 219 813 258 832 334 C848 397 852 485 842 567 C825 669 770 729 681 756 C648 766 616 769 579 769 H411 L270 819 C252 826 239 817 242 799 L251 690 C202 633 175 565 174 487 C173 343 266 228 409 213 C493 204 647 206 714 210 C719 210 724 210 728 211Z"
            fill="#7D52FF" opacity=".24" filter="url(#aura)">
            <animate attributeName="opacity" values="0.24;0.38;0.24" dur="3s" repeatCount="indefinite" />
          </path>

          {/* Left (blue) ambient aura */}
          <path
            d="M182 484 C185 381 232 296 314 245 C237 296 192 379 186 469 C180 552 204 616 255 680 C196 625 169 559 182 484Z"
            fill="#31DDFF" opacity=".34" filter="url(#aura)">
            <animate attributeName="opacity" values="0.34;0.48;0.34" dur="3.5s" repeatCount="indefinite" />
          </path>

          {/* Right (pink) ambient aura */}
          <path
            d="M780 244 C831 309 851 412 841 557 C833 650 793 710 729 743 C790 699 817 635 820 549 C825 417 809 320 780 244Z"
            fill="#FB4CDF" opacity=".34" filter="url(#aura)">
            <animate attributeName="opacity" values="0.34;0.50;0.34" dur="4s" repeatCount="indefinite" />
          </path>

          {/* Main body ring */}
          <path
            d="M728 211 C776 219 813 258 832 334 C848 397 852 485 842 567 C825 669 770 729 681 756 C648 766 616 769 579 769 H411 L270 819 C252 826 239 817 242 799 L251 690 C202 633 175 565 174 487 C173 343 266 228 409 213 C493 204 647 206 714 210 C719 210 724 210 728 211Z"
            fill="url(#ring)" stroke="#390B62" strokeWidth="2.7" strokeLinejoin="round" filter="url(#shadow)" />

          {/* Top-right body overlap */}
          <path
            d="M842 432 C848 477 847 524 839 568 C822 661 771 719 682 746 C649 756 616 759 579 759 H416 L396 766 H579 C616 766 650 763 684 753 C777 725 830 664 847 570 C855 524 856 477 850 431 Z"
            fill="#4A20A6" opacity=".11" />

          {/* Top highlight arc */}
          <path
            d="M184 470 C188 365 250 279 347 234 C382 218 424 212 474 211 H688 C705 211 718 212 729 215"
            stroke="url(#top)" strokeWidth="6.5" strokeLinecap="round" opacity=".91" />

          {/* Left highlight streak */}
          <path d="M181 474 C184 386 222 311 289 263" stroke="#70F0FF" strokeWidth="3" strokeLinecap="round" opacity=".73" />

          {/* Tail highlight */}
          <path d="M249 704 L242 799 C241 808 247 816 257 817" stroke="#70EEFF" strokeWidth="3" strokeLinecap="round" opacity=".65" />

          {/* Face cavity */}
          <path
            d="M455 309 C358 309 299 347 280 417 C258 497 278 569 338 625 C357 643 364 659 353 681 L321 740 L411 684 C425 675 439 671 455 671 H583 C679 671 739 621 756 543 C774 459 744 388 681 348 C646 324 608 310 558 309 Z"
            fill="url(#face)" stroke="#2E0D69" strokeWidth="5" strokeLinejoin="round" />

          {/* Face seam highlight */}
          <path
            d="M455 310 C359 310 302 348 283 417 C262 494 281 566 341 621 C360 639 367 657 357 678 L329 729 L413 678 C427 669 440 666 456 666 H582 C676 666 733 617 749 541 C766 460 739 392 680 353"
            stroke="url(#seam)" strokeWidth="2.5" strokeLinecap="round" opacity=".66" />

          {/* Left eye glow */}
          <ellipse cx="431.5" cy="469.5" rx="36" ry="65" fill="#59DFFF" opacity=".28" filter="url(#glow)">
            <animate attributeName="opacity" values="0.28;0.40;0.28" dur="2s" repeatCount="indefinite" />
          </ellipse>

          {/* Right eye glow */}
          <ellipse cx="602.5" cy="469.5" rx="36" ry="65" fill="#F16CFA" opacity=".27" filter="url(#glow)">
            <animate attributeName="opacity" values="0.27;0.42;0.27" dur="2.3s" repeatCount="indefinite" />
          </ellipse>

          {/* Left eye — pill shape with blink */}
          <rect x="400" y="411" width="63" height="117" rx="31.5" fill="url(#le)" stroke="#C9FBFF" strokeWidth="2">
            <animate attributeName="ry" values="31.5;31.5;31.5;10;31.5;31.5" dur="4s" repeatCount="indefinite" begin="0s" />
            <animate attributeName="height" values="117;117;117;20;117;117" dur="4s" repeatCount="indefinite" begin="0s" />
            <animate attributeName="y" values="411;411;411;459;411;411" dur="4s" repeatCount="indefinite" begin="0s" />
          </rect>

          {/* Right eye — pill shape with blink (offset) */}
          <rect x="571" y="411" width="63" height="117" rx="31.5" fill="url(#re)" stroke="#FFD5FB" strokeWidth="2">
            <animate attributeName="ry" values="31.5;31.5;31.5;10;31.5;31.5" dur="4s" repeatCount="indefinite" begin="0.15s" />
            <animate attributeName="height" values="117;117;117;20;117;117" dur="4s" repeatCount="indefinite" begin="0.15s" />
            <animate attributeName="y" values="411;411;411;459;411;411" dur="4s" repeatCount="indefinite" begin="0.15s" />
          </rect>

          {/* Left eye highlight */}
          <path d="M411 447 C413 428 421 418 434 414" stroke="#F7FFFF" strokeWidth="4.6" strokeLinecap="round" opacity=".82" />

          {/* Right eye highlight */}
          <path d="M582 444 C584 428 591 418 603 414" stroke="#FFF5FF" strokeWidth="4.6" strokeLinecap="round" opacity=".78" />

          {/* Smile glow */}
          <path
            d="M463 570 C478 589 497 598 517 598 C539 598 558 589 571 570"
            stroke="#9C5BFF" strokeWidth="18" strokeLinecap="round" opacity=".27" filter="url(#glow)">
            <animate attributeName="opacity" values="0.27;0.38;0.27" dur="2.5s" repeatCount="indefinite" />
          </path>

          {/* Smile shadow */}
          <path d="M463 570 C478 589 497 598 517 598 C539 598 558 589 571 570" stroke="#372071" strokeWidth="17" strokeLinecap="round" />

          {/* Smile gradient */}
          <path d="M463 570 C478 589 497 598 517 598 C539 598 558 589 571 570" stroke="url(#sm)" strokeWidth="12" strokeLinecap="round" />

          {/* Smile highlight */}
          <path d="M465 568 C479 583 496 590 514 591" stroke="#E8DFFF" strokeWidth="2.5" strokeLinecap="round" opacity=".70" />

          {/* Sparkle glow */}
          <path
            d="M766 195 C776 195 780 229 795 253 C807 272 826 282 850 291 C859 294 859 302 850 306 C826 315 807 326 795 343 C780 363 779 392 768 394 C758 393 756 364 744 346 C733 329 713 317 689 308 C678 304 678 296 689 291 C715 282 733 269 744 249 C755 229 758 195 766 195Z"
            fill="#F64BE4" opacity=".34" filter="url(#glow)">
            <animate attributeName="opacity" values="0.34;0.52;0.34" dur="2.8s" repeatCount="indefinite" />
          </path>

          {/* Sparkle */}
          <path
            d="M766 195 C776 195 780 229 795 253 C807 272 826 282 850 291 C859 294 859 302 850 306 C826 315 807 326 795 343 C780 363 779 392 768 394 C758 393 756 364 744 346 C733 329 713 317 689 308 C678 304 678 296 689 291 C715 282 733 269 744 249 C755 229 758 195 766 195Z"
            fill="url(#st)" stroke="#39084F" strokeWidth="4.3" strokeLinejoin="round">
            <animateTransform attributeName="transform" type="scale" values="1;1.08;1" dur="2.8s" repeatCount="indefinite" additive="sum" />
            <animateTransform attributeName="transform" type="translate" values="0 0;-4 -3;0 0" dur="2.8s" repeatCount="indefinite" additive="sum" />
          </path>

          {/* Sparkle highlight */}
          <path d="M766 212 C770 236 779 254 792 269 C802 280 813 288 828 294" stroke="#FFF5FF" strokeWidth="5.7" strokeLinecap="round" opacity=".89" />

          {/* Sparkle trail */}
          <path d="M809 372 C821 414 824 462 821 508" stroke="#FFB0F1" strokeWidth="2.4" strokeLinecap="round" opacity=".28" />
        </g>
      </svg>
    </div>
  );
}
