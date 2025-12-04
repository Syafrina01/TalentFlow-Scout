/*
  # Fix User Profile Creation Trigger

  1. Changes
    - Add exception handling to handle_new_user function
    - Ensure trigger doesn't fail silently
    - Add better error logging
  
  2. Security
    - Maintain existing RLS policies
    - Function runs with SECURITY DEFINER to have necessary permissions
*/

-- Recreate the function with better error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role text := 'user';
BEGIN
  -- Check if email is an admin email
  IF NEW.email IN ('syafrina.kamaruzaman@jlandgroup.com.my', 'ernisyafrina@gmail.com') THEN
    user_role := 'admin';
  END IF;

  -- Insert profile with error handling
  BEGIN
    INSERT INTO public.profiles (id, email, role, full_name)
    VALUES (
      NEW.id,
      NEW.email,
      user_role,
      COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
  EXCEPTION 
    WHEN unique_violation THEN
      -- Profile already exists, update it instead
      UPDATE public.profiles
      SET email = NEW.email,
          updated_at = now()
      WHERE id = NEW.id;
    WHEN OTHERS THEN
      -- Log the error but don't prevent user creation
      RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger is properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
