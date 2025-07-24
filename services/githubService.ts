
import { Repository } from '../types';

const MOCK_REPOS: Repository[] = [
  {
    id: 1,
    name: 'react',
    fullName: 'facebook/react',
    description: 'A declarative, efficient, and flexible JavaScript library for building user interfaces.',
    stars: 210000,
    language: 'JavaScript',
    topics: ['javascript', 'ui', 'library', 'frontend'],
    url: 'https://github.com/facebook/react',
    tags: ['frontend', 'library'],
  },
  {
    id: 2,
    name: 'tailwindcss',
    fullName: 'tailwindlabs/tailwindcss',
    description: 'A utility-first CSS framework for rapid UI development.',
    stars: 70000,
    language: 'TypeScript',
    topics: ['css', 'utility-first', 'design-system'],
    url: 'https://github.com/tailwindlabs/tailwindcss',
    tags: ['css', 'styling'],
  },
  {
    id: 3,
    name: 'fastapi',
    fullName: 'tiangolo/fastapi',
    description: 'FastAPI framework, high performance, easy to learn, fast to code, ready for production',
    stars: 60000,
    language: 'Python',
    topics: ['python', 'api', 'web', 'framework'],
    url: 'https://github.com/tiangolo/fastapi',
    tags: ['backend', 'python'],
  },
  {
    id: 4,
    name: 'awesome-selfhosted',
    fullName: 'awesome-selfhosted/awesome-selfhosted',
    description: 'A list of Free Software network services and web applications which can be hosted on your own servers',
    stars: 120000,
    language: null,
    topics: ['awesome', 'awesome-list', 'self-hosted'],
    url: 'https://github.com/awesome-selfhosted/awesome-selfhosted',
    tags: ['devops', 'list'],
  },
  {
    id: 5,
    name: 'three.js',
    fullName: 'mrdoob/three.js',
    description: 'JavaScript 3D library.',
    stars: 90000,
    language: 'JavaScript',
    topics: ['3d', 'webgl', 'graphics', 'javascript'],
    url: 'https://github.com/mrdoob/three.js',
    tags: [],
  },
   {
    id: 6,
    name: 'docker-compose',
    fullName: 'docker/compose',
    description: 'Define and run multi-container applications with Docker',
    stars: 30000,
    language: 'Go',
    topics: ['docker', 'compose', 'orchestration', 'containers'],
    url: 'https://github.com/docker/compose',
    tags: ['devops'],
  },
];


export const fetchStarredRepos = async (): Promise<Repository[]> => {
    // In a real app, this would be an API call to your backend:
    // const response = await fetch('/api/github/starred');
    // const data = await response.json();
    // return data;

    console.log("Fetching mock starred repos...");
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(MOCK_REPOS);
        }, 1000);
    });
};
