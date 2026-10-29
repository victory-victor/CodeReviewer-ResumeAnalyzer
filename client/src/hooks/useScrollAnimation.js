import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const useScrollAnimation = (config = {}) => {
  const ref = useRef(null);

  const {
    animation = 'fadeUp',
    duration = 0.8,
    delay = 0,
    stagger = 0.1,
    start = 'top 85%',
    end = 'bottom 20%',
    toggleActions = 'play none none none',
    markers = false,
  } = config;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const children = element.children;
    let tl = gsap.timeline({
      scrollTrigger: {
        trigger: element,
        start,
        end,
        toggleActions,
        markers,
      },
    });

    const animations = {
      fadeUp: {
        from: { opacity: 0, y: 60 },
        to: { opacity: 1, y: 0, duration, delay, stagger },
      },
      fadeIn: {
        from: { opacity: 0 },
        to: { opacity: 1, duration, delay, stagger },
      },
      fadeLeft: {
        from: { opacity: 0, x: -60 },
        to: { opacity: 1, x: 0, duration, delay, stagger },
      },
      fadeRight: {
        from: { opacity: 0, x: 60 },
        to: { opacity: 1, x: 0, duration, delay, stagger },
      },
      scaleUp: {
        from: { opacity: 0, scale: 0.8 },
        to: { opacity: 1, scale: 1, duration, delay, stagger },
      },
      slideUp: {
        from: { opacity: 0, y: 100 },
        to: { opacity: 1, y: 0, duration, delay, stagger, ease: 'power3.out' },
      },
    };

    const anim = animations[animation] || animations.fadeUp;

    if (children.length > 0 && stagger > 0) {
      tl.fromTo(children, anim.from, anim.to);
    } else {
      tl.fromTo(element, anim.from, { ...anim.to, stagger: 0 });
    }

    return () => {
      tl.kill();
      ScrollTrigger.getAll().forEach((trigger) => {
        if (trigger.vars.trigger === element) {
          trigger.kill();
        }
      });
    };
  }, [animation, duration, delay, stagger, start, end, toggleActions, markers]);

  return ref;
};

export default useScrollAnimation;
