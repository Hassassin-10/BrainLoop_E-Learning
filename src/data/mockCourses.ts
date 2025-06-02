
import type { Course, LearningStyle, ModuleType, DifficultyLevel } from '@/types/course';
import { Eye, Ear, Zap, Video, AudioLines, Gamepad2, FileTextIcon, ScanSearch, MessageSquare } from 'lucide-react';

export const learningStyleIcons: Record<LearningStyle, React.ElementType> = {
  visual: Eye,
  auditory: Ear,
  kinesthetic: Zap,
};

export const moduleTypeIcons: Record<ModuleType | 'discussion', React.ElementType> = {
    video: Video,
    audio: AudioLines,
    interactive_exercise: Gamepad2,
    reading_material: FileTextIcon,
    ar_interactive_lab: ScanSearch,
    discussion: MessageSquare,
};

export const difficultyLevels: DifficultyLevel[] = ['Beginner', 'Intermediate', 'Advanced'];

export const mockCourses: Course[] = [
  {
    id: 'course1',
    name: 'Visual Learners: Intro to Algebra',
    description: 'A course focusing on visual aids for understanding algebraic concepts. Learn about variables, equations, and basic algebraic operations through engaging videos and interactive simulations.',
    learningStyle: 'visual',
    category: 'Mathematics',
    difficulty: 'Beginner',
    price: 499,
    currency: 'INR',
    modules: [
      { 
        id: 'mod1_vid', 
        type: 'video', 
        title: 'Understanding Variables', 
        url: 'https://www.youtube.com/watch?v=v_Wo22-hXWk', 
        description: 'A short video explaining the concept of variables in algebra with visual examples.', 
        estimatedDuration: '10 mins',
        tags: ['algebra basics', 'variables', 'math introduction'],
        suggestedYoutubeVideos: [
          { videoId: 'NybHckSEQBI', title: 'What is Algebra? - Math Antics', thumbnailUrl: 'https://i.ytimg.com/vi/NybHckSEQBI/hqdefault.jpg', channelTitle: 'Math Antics' },
          { videoId: 'L42k9j6bA_I', title: 'Variables, Expressions, and Equations | Math with Mr. J', thumbnailUrl: 'https://i.ytimg.com/vi/L42k9j6bA_I/hqdefault.jpg', channelTitle: 'Math with Mr. J' },
        ]
      },
      { 
        id: 'mod1_ex', 
        type: 'interactive_exercise', 
        title: 'Algebra Tiles Simulation', 
        url: 'https://phet.colorado.edu/sims/html/expression-exchange/latest/expression-exchange_all.html', 
        description: 'Practice algebraic concepts using virtual algebra tiles.', 
        estimatedDuration: '25 mins',
        tags: ['algebra practice', 'interactive math', 'algebra tiles'],
      },
      { 
        id: 'mod1_read', 
        type: 'reading_material', 
        title: 'Key Algebraic Terms', 
        content: '# Key Terms\n\n- **Variable**: A symbol (usually a letter) that represents a number.\n- **Equation**: A statement that two expressions are equal.\n- **Coefficient**: A numerical or constant quantity placed before and multiplying the variable in an algebraic expression (e.g., *4* in 4x y).', 
        estimatedDuration: '15 mins',
        tags: ['algebra vocabulary', 'math terms'],
      },
      { 
        id: 'mod_ar_1', 
        type: 'ar_interactive_lab', 
        title: 'AR Equation Balancer', 
        url: 'https://phet.colorado.edu/en/simulation/equation-grapher', 
        description: 'Balance chemical equations in an augmented reality environment.', 
        estimatedDuration: '30 mins',
        tags: ['ar math', 'equation solver', 'interactive equations'],
      }
    ],
  },
  {
    id: 'course2',
    name: 'Auditory Learners: History of Science',
    description: 'Explore the fascinating history of scientific discoveries through engaging podcasts and audio lectures. This course is perfect for those who learn best by listening.',
    learningStyle: 'auditory',
    category: 'Science',
    difficulty: 'Intermediate',
    price: 799,
    currency: 'INR',
    modules: [
      { 
        id: 'mod2_aud', 
        type: 'audio', 
        title: 'Podcast: The Scientific Revolution', 
        url: 'https://example.com/podcast-revolution', 
        description: 'Listen to a podcast discussing the major figures and events of the Scientific Revolution.', 
        estimatedDuration: '40 mins',
        tags: ['science history', 'scientific revolution', 'podcast'],
        suggestedYoutubeVideos: [
          { videoId: 'zG2o_4j4U0s', title: 'The Scientific Revolution: Crash Course History of Science #12', thumbnailUrl: 'https://i.ytimg.com/vi/zG2o_4j4U0s/hqdefault.jpg', channelTitle: 'CrashCourse' },
        ]
      },
      { 
        id: 'mod2_vid', 
        type: 'video', 
        title: 'Animated Timeline of Discoveries', 
        url: 'https://www.youtube.com/watch?v=YvtCLceNf30', 
        description: 'A visually engaging animated timeline of key scientific discoveries throughout history.', 
        estimatedDuration: '20 mins',
        tags: ['science timeline', 'discoveries animation'],
      },
      { 
        id: 'mod2_read', 
        type: 'reading_material', 
        title: 'Biographies of Famous Scientists (Text for TTS)', 
        content: '## Notable Scientists\n\n- **Isaac Newton**: Developed laws of motion and universal gravitation.\n- **Marie Curie**: Pioneer in radioactivity research and the first woman to win a Nobel Prize.', 
        estimatedDuration: '30 mins',
        tags: ['scientists biography', 'newton', 'marie curie'],
      },
    ],
  },
   {
    id: 'course3',
    name: 'Kinesthetic Learning: Basics of Programming',
    description: 'Get hands-on with programming fundamentals. This course uses interactive exercises and coding challenges to teach you the basics of Python.',
    learningStyle: 'kinesthetic',
    category: 'Computer Science',
    difficulty: 'Beginner',
    price: 999,
    currency: 'INR',
    modules: [
      { 
        id: 'mod3_vid', 
        type: 'video', 
        title: 'What is Programming? (Engaging Explanation)', 
        url: 'https://www.youtube.com/watch?v=zOjov-2OZ0E', 
        description: 'An engaging video that explains what programming is, suitable for absolute beginners.', 
        estimatedDuration: '12 mins',
        tags: ['programming introduction', 'what is code', 'beginner coding'],
        suggestedYoutubeVideos: [
          { videoId: 'zOjov-2OZ0E', title: 'What is Programming?', thumbnailUrl: 'https://i.ytimg.com/vi/zOjov-2OZ0E/hqdefault.jpg', channelTitle: 'Programming with Mosh' },
          { videoId: 'ifo76Vyr0oM', title: 'Learn Python - Full Course for Beginners [Tutorial]', thumbnailUrl: 'https://i.ytimg.com/vi/ifo76Vyr0oM/hqdefault.jpg', channelTitle: 'freeCodeCamp.org' },
        ]
      },
      { 
        id: 'mod3_ex', 
        type: 'interactive_exercise', 
        title: 'Python Code Playground: Variables & Data Types', 
        url: 'https://www.programiz.com/python-programming/online-compiler/', 
        description: 'Practice Python syntax for variables and data types in an interactive playground.', 
        estimatedDuration: '45 mins',
        tags: ['python practice', 'coding exercises', 'variables'],
      },
      { 
        id: 'mod3_ar', 
        type: 'ar_interactive_lab', 
        title: 'AR Algorithm Visualizer', 
        url: 'https://visualgo.net/en', 
        description: 'Visualize common algorithms in augmented reality to understand their step-by-step execution.', 
        estimatedDuration: '35 mins',
        tags: ['ar programming', 'algorithm visualization', 'data structures ar'],
      }
    ],
  },
   {
    id: 'course4',
    name: 'Advanced AR Chemistry Lab',
    description: 'Dive deep into chemical reactions and molecular structures with advanced AR interactive laboratory simulations. Perfect for hands-on virtual experiments.',
    learningStyle: 'visual', 
    category: 'Science',
    difficulty: 'Advanced',
    price: 1299,
    currency: 'INR',
    modules: [
      { 
        id: 'mod4_vid', 
        type: 'video', 
        title: 'Introduction to AR Lab Safety', 
        url: 'https://www.youtube.com/watch?v=Qi3h18wJJiI', 
        description: 'Learn about safety protocols when working with AR chemistry labs.', 
        estimatedDuration: '10 mins',
        tags: ['ar lab safety', 'chemistry virtual lab'],
      },
      { 
        id: 'mod4_ar1', 
        type: 'ar_interactive_lab', 
        title: 'AR Titration Experiment', 
        url: 'https://labs.phet.colorado.edu/titration-screen/', 
        description: 'Perform a virtual titration experiment in augmented reality.', 
        estimatedDuration: '50 mins',
        tags: ['ar chemistry', 'titration simulation', 'virtual experiment'],
      }, 
      { 
        id: 'mod4_ar2', 
        type: 'ar_interactive_lab', 
        title: 'AR Molecular Building', 
        url: 'https://molview.org/', 
        description: 'Build and inspect molecular structures in an interactive AR environment.', 
        estimatedDuration: '45 mins',
        tags: ['ar molecules', 'molecular structure', 'chemistry visualization'],
      }, 
      { 
        id: 'mod4_read', 
        type: 'reading_material', 
        title: 'Lab Report Guidelines', 
        content: 'Your lab reports should follow standard scientific formatting...', 
        estimatedDuration: '20 mins',
        tags: ['lab report', 'scientific writing'],
      }
    ],
  },
  {
    id: 'course5',
    name: 'Physics Explorations with AR',
    description: 'Explore fundamental physics concepts using interactive AR simulations.',
    learningStyle: 'kinesthetic',
    category: 'Physics',
    difficulty: 'Intermediate',
    price: 699,
    currency: 'INR',
    modules: [
        { 
          id: 'mod5_ar1', 
          type: 'ar_interactive_lab', 
          title: 'AR Electric Fields Explorer', 
          url: 'https://ophysics.com/em.html', 
          description: 'Visualize and interact with electric fields in AR.', 
          estimatedDuration: '40 mins',
          tags: ['ar physics', 'electric fields', 'physics simulation'],
        },
        { 
          id: 'mod5_ar2', 
          type: 'ar_interactive_lab', 
          title: 'AR Free Body Diagrams', 
          url: 'https://www.physicsclassroom.com/Physics-Interactives/Newtons-Laws/Free-Body-Diagrams/Free-Body-Diagrams-Interactive', 
          description: 'Construct and analyze free body diagrams in an AR environment.', 
          estimatedDuration: '35 mins',
          tags: ['ar newton laws', 'free body diagram', 'physics interactive'],
        }
    ]
  },
  {
    id: 'course6',
    name: 'Signal Processing with AR',
    description: 'Understand complex signal processing concepts like Fourier series through AR visualization.',
    learningStyle: 'visual',
    category: 'Engineering',
    difficulty: 'Advanced',
    price: 1499,
    currency: 'INR',
    modules: [
        { 
          id: 'mod6_ar1', 
          type: 'ar_interactive_lab', 
          title: 'AR Fourier Simulator', 
          url: 'https://www.falstad.com/fourier/', 
          description: 'Simulate and visualize Fourier series in augmented reality.', 
          estimatedDuration: '50 mins',
          tags: ['ar engineering', 'fourier series', 'signal processing ar'],
        }
    ]
  }
];

