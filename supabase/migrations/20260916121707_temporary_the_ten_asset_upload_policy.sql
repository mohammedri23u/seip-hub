create policy "temporary_the_ten_asset_upload_20260916"
on storage.objects
for insert
to anon
with check (
  bucket_id = 'the-ten-assets'
  and name like 'runtime-v1/%'
);
