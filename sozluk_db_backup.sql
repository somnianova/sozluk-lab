-- MySQL dump 10.13  Distrib 9.2.0, for Win64 (x86_64)
--
-- Host: localhost    Database: sozluk_db
-- ------------------------------------------------------
-- Server version	9.2.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `definitions`
--

DROP TABLE IF EXISTS `definitions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `definitions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `word_id` int NOT NULL,
  `definition_text` text NOT NULL,
  `example_sentence` text,
  `part_of_speech` varchar(50) DEFAULT NULL,
  `sense_number` int DEFAULT '1',
  `sub_letter` varchar(5) DEFAULT NULL,
  `sense_label` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `word_id` (`word_id`),
  FULLTEXT KEY `definition_text` (`definition_text`),
  FULLTEXT KEY `definition_text_2` (`definition_text`),
  CONSTRAINT `definitions_ibfk_1` FOREIGN KEY (`word_id`) REFERENCES `words` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `definitions`
--

LOCK TABLES `definitions` WRITE;
/*!40000 ALTER TABLE `definitions` DISABLE KEYS */;
INSERT INTO `definitions` VALUES (14,14,'akıl, akli denge','beden, zihin ve ruh için şifa','',1,NULL,'1a'),(15,14,'bilinen doğa yasalarıyla açıklanamayan bir varlık :HAYALET','Büyükannem ve büyükbabam kendilerini kötü ruhlardan korumak için muska takarlardı.\n\nKötü ruhları kovmak için zerdeçal ve sarımsak çelenkleri takılır.\n\nCesetleri yakmak, ölülerin ruhlarını bir sonraki dünyaya gitmeye ikna etmek içindir.','',1,NULL,'3a'),(16,14,'özellikle coşku veya çöküntüyle ilgili duygusal bir durum','Takım kaybetmesine rağmen müthiş bir ruhla oynadılar. Çok ruhsuz bir insansın. (şevksiz, sahte)','',1,NULL,'2a'),(17,14,'atmosfer','Filmi, kitabının ruhunu yakalayamamış.\n\nKişiliği olan ve günün ruhunu yakalayan fotoğraflar arıyoruz.\n1960\'larda rock müzisyenleri olarak, çağın / zamanların ruhunun büyük bir parçasıydılar.\n\nTurizm Bali\'nin ruhunu yok etmedi.','',1,NULL,'2b'),(18,14,'karakter, nitelik, mizaç','Kendimi özgür bir ruh olarak düşünmeyi seviyorum.\n\n85 yaşındayım ama ruhen hala genç hissediyorum.\n\nGerçekten de kilit soru, örgütün insan ruhuna hizmet edip etmediği veya ezip geçmediğidir. \n\nMerhamet , insan ruhunun yalnızca bir yönüdür.','',1,NULL,'1b'),(19,14,'düşünceye nüfuz eden bir tutum :İLKE','Ruhu her zaman bizimle olacak.\n\n...işçi hareketinin gerçek ruhu.','',1,NULL,'1c'),(21,14,'kimyasal konsantrasyonlar veya saflaştırmalar','tuz ruhu\nkükürt ruhu','',1,NULL,'4a');
/*!40000 ALTER TABLE `definitions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `relations`
--

DROP TABLE IF EXISTS `relations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `relations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `left_word_id` int NOT NULL,
  `right_word_id` int NOT NULL,
  `relation_type` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `left_word_id` (`left_word_id`),
  KEY `right_word_id` (`right_word_id`),
  CONSTRAINT `relations_ibfk_1` FOREIGN KEY (`left_word_id`) REFERENCES `words` (`id`) ON DELETE CASCADE,
  CONSTRAINT `relations_ibfk_2` FOREIGN KEY (`right_word_id`) REFERENCES `words` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `relations`
--

LOCK TABLES `relations` WRITE;
/*!40000 ALTER TABLE `relations` DISABLE KEYS */;
INSERT INTO `relations` VALUES (20,14,16,'synonym');
/*!40000 ALTER TABLE `relations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `words`
--

DROP TABLE IF EXISTS `words`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `words` (
  `id` int NOT NULL AUTO_INCREMENT,
  `word` varchar(255) NOT NULL,
  `origin` text,
  `frequency_tags` varchar(50) DEFAULT NULL,
  `audio_url` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  FULLTEXT KEY `word` (`word`),
  FULLTEXT KEY `word_2` (`word`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `words`
--

LOCK TABLES `words` WRITE;
/*!40000 ALTER TABLE `words` DISABLE KEYS */;
INSERT INTO `words` VALUES (14,'ruh','',NULL,NULL),(16,'psike','psk','W1',''),(18,'İLKE',NULL,NULL,NULL),(19,'HAYALET',NULL,NULL,NULL);
/*!40000 ALTER TABLE `words` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-12  9:09:17
