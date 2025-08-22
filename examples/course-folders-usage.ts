/**
 * Example usage of the course folder functionality
 * This file demonstrates how to use the new folder features
 */

// Example 1: Creating a folder
async function createFolderExample() {
  try {
    const response = await fetch('/api/admin/events/event-123/courses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Primaria',
        description: 'Cursos de primaria',
        is_folder: true,
        level_id: 'level-456',
      }),
    });

    if (response.ok) {
      const folder = await response.json();
      console.log('Folder created:', folder);
    }
  } catch (error) {
    console.error('Error creating folder:', error);
  }
}

// Example 2: Creating a course inside a folder
async function createCourseInFolderExample() {
  try {
    const response = await fetch('/api/admin/events/event-123/courses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Matemáticas 1A',
        grade: '1',
        section: 'A',
        parent_course_id: 'folder-789', // ID of the folder created above
        level_id: 'level-456',
      }),
    });

    if (response.ok) {
      const course = await response.json();
      console.log('Course created in folder:', course);
    }
  } catch (error) {
    console.error('Error creating course:', error);
  }
}

// Example 3: Getting contents of a folder
async function getFolderContentsExample() {
  try {
    const response = await fetch('/api/admin/events/event-123/courses?parent_course_id=folder-789');
    
    if (response.ok) {
      const data = await response.json();
      console.log('Folder contents:', data.courses);
    }
  } catch (error) {
    console.error('Error getting folder contents:', error);
  }
}

// Example 4: Moving a course to a different folder
async function moveCourseExample() {
  try {
    // Using the utility function
    const { moveCourseToFolder } = await import('@/lib/courses/folders');
    
    const updatedCourse = await moveCourseToFolder('course-123', 'new-folder-456');
    console.log('Course moved:', updatedCourse);
  } catch (error) {
    console.error('Error moving course:', error);
  }
}

// Example 5: Getting folder hierarchy
async function getFolderHierarchyExample() {
  try {
    // Using the utility function
    const { getFolderHierarchy } = await import('@/lib/courses/folders');
    
    const hierarchy = await getFolderHierarchy('course-123');
    console.log('Folder hierarchy:', hierarchy); // e.g., ['Primaria', 'Primer Grado', 'Sección A']
  } catch (error) {
    console.error('Error getting folder hierarchy:', error);
  }
}

// Example 6: Checking if a course is a folder
async function checkIfFolderExample() {
  try {
    // Using the utility function
    const { isCourseFolder } = await import('@/lib/courses/folders');
    
    const isFolder = await isCourseFolder('course-123');
    console.log('Is folder:', isFolder);
  } catch (error) {
    console.error('Error checking if folder:', error);
  }
}

export {
  createFolderExample,
  createCourseInFolderExample,
  getFolderContentsExample,
  moveCourseExample,
  getFolderHierarchyExample,
  checkIfFolderExample
};