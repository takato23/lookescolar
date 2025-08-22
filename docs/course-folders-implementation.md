# Course Folders Implementation

## Overview
This document describes the implementation of folder functionality for courses within events in the LookEscolar system. This feature allows users to organize courses into hierarchical folders for better management and navigation.

## Database Changes

### Migration File
A new migration file has been created at `supabase/migrations/20250822_add_course_folders.sql` that adds the following columns to the `courses` table:

1. `parent_course_id` (UUID) - References another course as the parent folder
2. `is_folder` (BOOLEAN) - Indicates whether the course record is actually a folder

### New Database Functions
The migration also creates the following utility functions:

1. `get_child_courses(folder_id UUID)` - Returns all child courses and folders of a given folder
2. `is_course_folder(course_id UUID)` - Checks if a course record is a folder
3. `courses_with_folder_info` - A view that provides course information with folder-related data

## API Changes

### Updated Course Endpoints
The course API endpoints have been updated to support folder functionality:

1. **GET /api/admin/events/[id]/courses** - Now supports filtering by `parent_course_id` to get contents of a specific folder
2. **POST /api/admin/events/[id]/courses** - Now supports creating folders by setting `is_folder: true` and optionally setting `parent_course_id`

### New Utility Functions
New utility functions have been created in `lib/courses/folders.ts`:

1. `createCourseFolder()` - Creates a new course folder
2. `getCoursesInFolder()` - Gets all courses and folders within a specific folder
3. `getFolderHierarchy()` - Gets the folder path hierarchy for a course
4. `moveCourseToFolder()` - Moves a course or folder to a different parent
5. `isCourseFolder()` - Checks if a course is actually a folder

## UI Changes

### Hierarchical Navigation Component
The `HierarchicalNavigation` component has been updated with the following features:

1. **Folder Display** - Folders are visually distinguished from regular courses with yellow borders and folder icons
2. **Folder Navigation** - Clicking on a folder navigates into that folder's contents
3. **Breadcrumb Navigation** - Updated to show folder paths in the navigation trail
4. **Folder Creation** - Added "Nueva Carpeta" button to create new folders
5. **Folder Dialog** - New dialog for creating folders with name and description

### Visual Improvements
- Folders are displayed with a yellow border and folder icon
- Folder contents are shown in a grid or list view similar to courses
- Back navigation properly handles folder hierarchy

## Usage

### Creating a Folder
1. Navigate to the courses view for an event
2. Click the "Nueva Carpeta" button
3. Enter a name and optional description for the folder
4. The folder will appear in the course list with a folder icon

### Organizing Courses into Folders
1. Create a folder as described above
2. When creating or editing a course, set the `parent_course_id` to the folder's ID
3. The course will now appear within that folder instead of at the root level

### Navigating Folders
1. Click on a folder in the course list to view its contents
2. Use the back button to navigate up the folder hierarchy
3. The breadcrumb trail shows the current path including folders

## Technical Details

### Data Model
The folder implementation uses a self-referential relationship in the courses table:
- Regular courses have `is_folder = false` (default)
- Folders have `is_folder = true`
- Both can have a `parent_course_id` pointing to their parent folder
- Root-level courses and folders have `parent_course_id = null`

### Validation
- The API validates that `parent_course_id` references an actual folder (not a regular course)
- Name uniqueness is enforced within the same parent context
- Folders cannot be directly assigned to students (this is enforced at the application level)

### Performance
- Indexes have been added on `parent_course_id` and `is_folder` columns for efficient querying
- Recursive functions are provided for complex folder operations
- Pagination is supported for large folder contents

## Future Enhancements
1. Drag-and-drop folder organization
2. Folder renaming and deletion
3. Bulk operations for moving multiple courses
4. Folder permissions and access control
5. Folder metadata and custom properties