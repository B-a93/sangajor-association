export const publicCourses = [
  { slug: 'everyday-digital-technology-skills', title: 'Everyday Digital & Technology Skills', summary: 'Build confidence with devices, email, documents, online safety and introductory AI tools.', format: 'Online self-paced course' },
  { slug: 'digital-income-online-work', title: 'Digital Income & Online Work', summary: 'Explore legitimate online work, digital payments, freelancing and scam awareness.', format: 'Online self-paced course' },
  { slug: 'everyday-cooking-skills', title: 'Everyday Cooking Skills', summary: 'Learn kitchen safety, organisation and practical methods for balanced everyday meals.', format: 'Practical course' },
  { slug: 'practical-baking-skills', title: 'Practical Baking Skills', summary: 'Learn measuring, ingredient science, oven control, decoration and safe production.', format: 'Practical course' },
] as const;

export type PublicCourseSlug = typeof publicCourses[number]['slug'];
