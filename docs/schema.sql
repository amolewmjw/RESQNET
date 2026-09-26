-- Generated from SQLAlchemy metadata. SQLite foreign keys must be enabled.
PRAGMA foreign_keys=ON;

CREATE TABLE ambulance_types (
	id VARCHAR NOT NULL, 
	label VARCHAR NOT NULL, 
	description VARCHAR NOT NULL, 
	PRIMARY KEY (id)
);

CREATE TABLE equipment_types (
	id VARCHAR NOT NULL, 
	label VARCHAR NOT NULL, 
	description VARCHAR NOT NULL, 
	PRIMARY KEY (id)
);

CREATE TABLE hazard_zones (
	id VARCHAR NOT NULL, 
	kind VARCHAR NOT NULL, 
	label VARCHAR NOT NULL, 
	active BOOLEAN NOT NULL, 
	polygon JSON NOT NULL, 
	note VARCHAR NOT NULL, 
	PRIMARY KEY (id)
);

CREATE TABLE road_nodes (
	id VARCHAR NOT NULL, 
	label VARCHAR NOT NULL, 
	x FLOAT NOT NULL, 
	y FLOAT NOT NULL, 
	PRIMARY KEY (id)
);

CREATE TABLE simulation_meta (
	id INTEGER NOT NULL, 
	scenario_id VARCHAR NOT NULL, 
	title VARCHAR NOT NULL, 
	description VARCHAR NOT NULL, 
	revision INTEGER NOT NULL, 
	schema_version INTEGER NOT NULL, 
	PRIMARY KEY (id), 
	CHECK (id = 1), 
	CHECK (revision >= 1)
);

CREATE TABLE ambulances (
	id VARCHAR NOT NULL, 
	label VARCHAR NOT NULL, 
	type_id VARCHAR NOT NULL, 
	node_id VARCHAR NOT NULL, 
	home_node_id VARCHAR NOT NULL, 
	vehicle_class VARCHAR NOT NULL, 
	length_m FLOAT NOT NULL, 
	width_m FLOAT NOT NULL, 
	height_m FLOAT NOT NULL, 
	approved_stretcher_positions INTEGER NOT NULL, 
	approved_seated_positions INTEGER NOT NULL, 
	occupied_stretcher_positions INTEGER NOT NULL, 
	occupied_seated_positions INTEGER NOT NULL, 
	equipment JSON NOT NULL, 
	crew JSON NOT NULL, 
	declared_capabilities JSON NOT NULL, 
	status VARCHAR NOT NULL, 
	configuration_source VARCHAR NOT NULL, 
	PRIMARY KEY (id), 
	CHECK (length_m > 0 AND width_m > 0 AND height_m > 0), 
	CHECK (approved_stretcher_positions >= 0 AND approved_seated_positions >= 0), 
	CHECK (occupied_stretcher_positions >= 0 AND occupied_stretcher_positions <= approved_stretcher_positions), 
	CHECK (occupied_seated_positions >= 0 AND occupied_seated_positions <= approved_seated_positions), 
	CHECK (status IN ('available','unavailable')), 
	FOREIGN KEY(type_id) REFERENCES ambulance_types (id), 
	FOREIGN KEY(node_id) REFERENCES road_nodes (id), 
	FOREIGN KEY(home_node_id) REFERENCES road_nodes (id)
);

CREATE TABLE hospitals (
	id VARCHAR NOT NULL, 
	label VARCHAR NOT NULL, 
	node_id VARCHAR NOT NULL, 
	category VARCHAR NOT NULL, 
	authorization_reference VARCHAR NOT NULL, 
	beds_total INTEGER NOT NULL, 
	beds_available INTEGER NOT NULL, 
	icu_total INTEGER NOT NULL, 
	icu_available INTEGER NOT NULL, 
	facilities JSON NOT NULL, 
	PRIMARY KEY (id), 
	CHECK (category IN ('government','authorized_private','non_authorized_private')), 
	CHECK (beds_total >= 0 AND beds_available >= 0 AND beds_available <= beds_total), 
	CHECK (icu_total >= 0 AND icu_available >= 0 AND icu_available <= icu_total), 
	CHECK (category != 'authorized_private' OR length(trim(authorization_reference)) > 0), 
	FOREIGN KEY(node_id) REFERENCES road_nodes (id)
);

CREATE TABLE patients (
	id VARCHAR NOT NULL, 
	label VARCHAR NOT NULL, 
	incident_id VARCHAR NOT NULL, 
	node_id VARCHAR NOT NULL, 
	severity VARCHAR NOT NULL, 
	transport_position VARCHAR NOT NULL, 
	required_capabilities JSON NOT NULL, 
	required_equipment JSON NOT NULL, 
	required_crew_roles JSON NOT NULL, 
	required_facilities JSON NOT NULL, 
	clinical_compatibility_group VARCHAR NOT NULL, 
	status VARCHAR NOT NULL, 
	PRIMARY KEY (id), 
	CHECK (severity IN ('critical','urgent','stable')), 
	CHECK (transport_position IN ('stretcher','seated')), 
	CHECK (status = 'waiting'), 
	FOREIGN KEY(node_id) REFERENCES road_nodes (id)
);

CREATE TABLE roads (
	id VARCHAR NOT NULL, 
	source VARCHAR NOT NULL, 
	target VARCHAR NOT NULL, 
	distance_km FLOAT NOT NULL, 
	travel_time_min FLOAT NOT NULL, 
	max_width_m FLOAT NOT NULL, 
	max_height_m FLOAT NOT NULL, 
	allowed_vehicle_classes JSON NOT NULL, 
	blocked BOOLEAN NOT NULL, 
	hazard_zone_id VARCHAR, 
	restriction_note VARCHAR NOT NULL, 
	PRIMARY KEY (id), 
	CHECK (distance_km > 0 AND travel_time_min > 0), 
	CHECK (max_width_m > 0 AND max_height_m > 0), 
	CHECK (source != target), 
	FOREIGN KEY(source) REFERENCES road_nodes (id), 
	FOREIGN KEY(target) REFERENCES road_nodes (id), 
	FOREIGN KEY(hazard_zone_id) REFERENCES hazard_zones (id)
);
