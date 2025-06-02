
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { mockCourses, learningStyleIcons } from '@/data/mockCourses';
import type { Course } from '@/types/course';
import { ArrowRight, Library, Loader2 } from 'lucide-react';
import PaymentButton from '@/components/payment-button'; // Import PaymentButton

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // In a real app, fetch courses from an API
    setCourses(mockCourses);
  }, []);

  if (!mounted) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-primary md:text-4xl flex items-center">
          <Library className="mr-3 h-8 w-8" /> Course Catalog
        </h1>
        <p className="text-muted-foreground mt-2">
          Explore our available courses. Each course offers a variety of learning materials including video lectures and interactive content.
        </p>
      </div>

      {courses.length === 0 ? (
        <p className="text-center text-muted-foreground text-lg py-10">No courses available at the moment. Please check back later.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => {
            const LearningIcon = learningStyleIcons[course.learningStyle];
            const placeholderImageIndex = parseInt(course.id.replace('course', ''), 10) % 4 + 5; // cycle through random=5,6,7,8 for variety

            return (
              <Card key={course.id} className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="relative h-48 w-full">
                  <Image
                    src={`https://picsum.photos/seed/${course.id}/400/200`}
                    alt={course.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover"
                    data-ai-hint={`${course.category || 'education'} learning`}
                  />
                   <div className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full">
                     <LearningIcon className="h-5 w-5" />
                   </div>
                </div>
                <CardHeader>
                  <CardTitle className="text-xl text-primary">{course.name}</CardTitle>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {course.category && <Badge variant="secondary">{course.category}</Badge>}
                    {course.difficulty && <Badge variant="outline">{course.difficulty}</Badge>}
                    {course.price && course.currency && (
                      <Badge variant="default" className="bg-green-600 text-white dark:bg-green-500 dark:text-black">
                        {course.currency} {course.price}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <CardDescription>{course.description.substring(0, 120)}{course.description.length > 120 ? '...' : ''}</CardDescription>
                </CardContent>
                <CardFooter className="flex-col space-y-2">
                  <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                    <Link href={`/courses/${course.id}`}>
                      View Modules <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  {course.price && course.currency && (
                    <PaymentButton course={course} />
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
