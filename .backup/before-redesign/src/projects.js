// All site content lives here.
//
// project.color  one of: lilac, mint, tomato, peach. It tints the left panel, the project's cover and its tiles.
// project.draft  true = listed as "soon", not clickable. Remove it when the project is ready.
// slides         { src, w, h, alt, caption } for an image, or { placeholder: 'what goes here' } until it exists.
//                The first image is the cover on the work index.

export const site = {
  email: 'robertogonzalezsosa@gmail.com',
  instagram: 'roberto_gs',
  studio: 'MACEL Studios, 658 Queen St W, Toronto, ON M6J 1E5',
};

export const projects = [
  {
    slug: 'dress-loud',
    color: 'lilac',
    title: 'Dress Loud',
    year: '2025',
    client: 'Voice for Deaf Kids',
    place: 'Toronto, ON',
    disciplines: 'Brand Design, Editorial, Illustration, Photography, Public Speaking',
    text: [
      'This past May, I had the opportunity to volunteer for #DressLoud, an event that brings awareness for children who are Deaf and Hard of Hearing hosted by @voice4deafkids.',
      'This project was immensely fun, rewarding, challenging and scary all at the same time. It was the first time I was able to label myself as a graphic designer out in the real world, and the first time I wasn’t afraid to be happy with the work I was producing. I was tasked with creating an image and a language for the event from scratch, which meant we got a lot of range with where we wanted to take it.',
      'Here’s what I made! All are original illustrations (colored by the wonderful @poofy_itsme), photographs, posters, banners, badges and presentations made by yours truly! All with a brand new image that I feel captures the meaning of Dress Loud, of being bold and embracing the colors of a unique world. I have learned so much from being one half in an interabled relationship, so spreading the word through this platform felt personal and important.',
    ],
    slides: [
      { src: '/work/dress-loud/01-poster.jpg', w: 1553, h: 2400, caption: 'Poster', alt: 'Dress Loud poster: four illustrated kids climbing over each other on a pink-to-violet gradient, with the headline “A month for self-expression and social inclusion for deaf and hard of hearing kids”.' },
      { src: '/work/dress-loud/02-headline.jpg', w: 2000, h: 1535, caption: 'Headline, detail', alt: 'Detail of the poster headline, bold sans mixed with an italic serif.' },
      { src: '/work/dress-loud/03-figures.jpg', w: 1600, h: 2311, caption: 'Illustration, detail', alt: 'Detail of the illustrated figures: a kid in a power wheelchair pointing ahead, another in a red turban.' },
      { src: '/work/dress-loud/04-logotype.jpg', w: 1900, h: 1450, caption: 'Logotype', alt: 'Detail of the Dress Loud! logotype in navy with a gradient second line.' },
      { placeholder: 'Photography' },
      { placeholder: 'Banners & badges' },
      { placeholder: 'Presentation' },
    ],
  },
  { slug: 'project-2', color: 'mint', title: 'Project 2', draft: true },
  { slug: 'project-3', color: 'tomato', title: 'Project 3', draft: true },
  { slug: 'project-4', color: 'peach', title: 'Project 4', draft: true },
];
