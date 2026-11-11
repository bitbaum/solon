-- REFRESH MATERIALIZED VIEW is allowed only to the view's owner, and the
-- importer does not run as the role that migrated the database: on production
-- every Places import that changed data failed with "permission denied for
-- materialized view place_ancestors". The refresh moves into a function that
-- runs with its owner's rights (the migration role, which owns the view), so
-- any role may ask for the refresh and none may do anything else to the view.
CREATE FUNCTION "place_ancestors_refresh"() RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW "place_ancestors";
END;
$$;
