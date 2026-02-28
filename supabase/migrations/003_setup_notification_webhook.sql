-- Ejecutar en Supabase SQL Editor para automatizar el envío desde la BD
-- Se acciona automáticamente cuando un cliente nuevo se inserta.

create or replace function public.handle_new_user_notification()
returns trigger as $$
begin
  perform net.http_post(
      url:='https://pznponymhusxgrwbahid.supabase.co/functions/v1/send-welcome-notification',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer sb_publishable_lkLjDbIkHG21Az1HgL6wdw__FJdPGRl"}'::jsonb,
      body:=json_build_object('record', row_to_json(NEW))::jsonb
  );
  return new;
end;
$$ language plpgsql security definer;

-- Crear el trigger que escucha los inserts en 'clientes'
drop trigger if exists on_client_created on public.clientes;
create trigger on_client_created
  after insert on public.clientes
  for each row execute procedure public.handle_new_user_notification();
