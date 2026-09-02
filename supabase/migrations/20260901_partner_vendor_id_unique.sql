alter table partners
  add constraint partners_vendor_id_unique unique (vendor_id);
