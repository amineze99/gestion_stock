create database gestion_stock;
use gestion_stock;
CREATE TABLE Utilisateur (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nom VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    mot_de_passe VARCHAR(255) NOT NULL, -- لتخزين كلمات المرور المشفرة
    role ENUM('Manager', 'Vendeur', 'Acheteur') NOT NULL
);
create table fournisseur (
id int primary key auto_increment,
nom varchar(100) not null,
contact varchar(50),
solde_a_payer decimal(15,2) default 0.00
);
CREATE TABLE Categorie (
    id INT PRIMARY KEY AUTO_INCREMENT,
    libelle VARCHAR(100) NOT NULL
);
CREATE TABLE Produit (
    id INT PRIMARY KEY AUTO_INCREMENT,
    referencee VARCHAR(50) UNIQUE NOT NULL,
    designation VARCHAR(255) NOT NULL,
    prix_achat DECIMAL(15, 2) NOT NULL,
    prix_vente DECIMAL(15, 2) NOT NULL,
    stock_actuel INT DEFAULT 0,
    quantite_min INT DEFAULT 5,
    id_categorie INT,
    FOREIGN KEY (id_categorie) REFERENCES Categorie(id) ON DELETE SET NULL
);
CREATE TABLE Operation (
    id INT PRIMARY KEY AUTO_INCREMENT,
    date_op DATETIME DEFAULT CURRENT_TIMESTAMP,
    type_op ENUM('Achat', 'Vente') NOT NULL,
    montant_total DECIMAL(15, 2) NOT NULL,
    id_utilisateur INT,
    id_client INT DEFAULT NULL,
    id_fournisseur INT DEFAULT NULL,
    FOREIGN KEY (id_utilisateur) REFERENCES Utilisateur(id),
    FOREIGN KEY (id_fournisseur) REFERENCES Fournisseur(id)
);
CREATE TABLE Details_Operation ( -- many_to_many
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_operation INT,
    id_produit INT,
    quantite INT NOT NULL,
    prix_unitaire DECIMAL(15, 2) NOT NULL,
    FOREIGN KEY (id_operation) REFERENCES Operation(id) ON DELETE CASCADE,
    FOREIGN KEY (id_produit) REFERENCES Produit(id)
);
-- 1. إضافة قيود التحقق
ALTER TABLE Produit ADD CONSTRAINT chk_stock_non_negative CHECK (stock_actuel >= 0);

-- 2. إضافة فهارس للسرعة
CREATE INDEX idx_produit_ref ON Produit(reference);
CREATE INDEX idx_op_date ON Operation(date_op);

-- 3. تريجر (Trigger) لتحديث المخزون تلقائياً عند البيع
DELIMITER //
CREATE TRIGGER update_stock_after_sale
AFTER INSERT ON Details_Operation
FOR EACH ROW
BEGIN
    -- تحديث الكمية في جدول المنتجات
    UPDATE Produit 
    SET stock_actuel = stock_actuel - NEW.quantite
    WHERE id = NEW.id_produit;
END; //
DELIMITER ;
